from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import pytest
from app.core.config import settings
from app.core.security import generate_otp, hash_otp, verify_otp
from app.models import PasswordResetOTP, User
from app.services.email_service import send_password_reset_otp_email


def test_otp_helpers():
    code = generate_otp(6)
    assert len(code) == 6
    assert code.isdigit()

    code_hash = hash_otp(code)
    assert code_hash != code
    assert len(code_hash) == 64  # SHA-256 length

    assert verify_otp(code, code_hash) is True
    assert verify_otp("000000" if code != "000000" else "111111", code_hash) is False


def test_otp_forgot_password_and_full_recovery_flow(client, db):
    # 1. Register user
    reg = client.post(
        "/api/auth/register",
        json={
            "name": "Priya Patel",
            "email": "priya.patel.otp@customgift.dev",
            "password": "OriginalPassword123",
        },
    )
    assert reg.status_code == 201

    # 2. Step 1: Request OTP — captured via mock, NEVER exposed in API response
    with patch("app.api.auth.send_password_reset_otp_email", return_value=True) as mock_send:
        forgot_res = client.post(
            "/api/auth/forgot-password",
            json={"email": "priya.patel.otp@customgift.dev"},
        )
        assert forgot_res.status_code == 200
        forgot_data = forgot_res.json()

        # Strict security: No dev_otp or plain OTP in response
        assert "dev_otp" not in forgot_data
        assert "verification instructions have been sent" in forgot_data["message"]
        assert forgot_data["cooldown_seconds"] == 60
        assert forgot_data["expires_in_minutes"] == 5

        # Extract OTP from the email sender call
        assert mock_send.called
        recipient_arg, otp_code = mock_send.call_args[0][0], mock_send.call_args[0][1]
        assert recipient_arg == "priya.patel.otp@customgift.dev"
        assert len(otp_code) == 6
        assert otp_code.isdigit()

    # Verify that database stored the SHA-256 hash, NOT plaintext
    user = db.query(User).filter(User.email == "priya.patel.otp@customgift.dev").first()
    otp_row = (
        db.query(PasswordResetOTP)
        .filter(PasswordResetOTP.user_id == user.id)
        .order_by(PasswordResetOTP.id.desc())
        .first()
    )
    assert otp_row is not None
    assert otp_row.otp_hash == hash_otp(otp_code)
    assert otp_code not in otp_row.otp_hash

    # 3. Cooldown enforcement: immediate second request should trigger 429
    cooldown_res = client.post(
        "/api/auth/forgot-password",
        json={"email": "priya.patel.otp@customgift.dev"},
    )
    assert cooldown_res.status_code == 429
    assert "seconds before requesting" in cooldown_res.json()["detail"]

    # 4. Step 2: Verify OTP
    verify_res = client.post(
        "/api/auth/verify-reset-otp",
        json={
            "email": "priya.patel.otp@customgift.dev",
            "otp": otp_code,
        },
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert "reset_token" in verify_data
    reset_token = verify_data["reset_token"]

    # 5. Step 3: Reset password
    reset_res = client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": reset_token,
            "new_password": "NewStrongPassword456",
            "confirm_password": "NewStrongPassword456",
        },
    )
    assert reset_res.status_code == 200
    assert "successfully" in reset_res.json()["message"]

    # 6. Single-use enforcement: Token cannot be reused
    reuse_res = client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": reset_token,
            "new_password": "AnotherPassword789",
            "confirm_password": "AnotherPassword789",
        },
    )
    assert reuse_res.status_code == 400

    # 7. Verify old password is rejected
    fail_login = client.post(
        "/api/auth/login",
        json={"email": "priya.patel.otp@customgift.dev", "password": "OriginalPassword123"},
    )
    assert fail_login.status_code == 401

    # 8. Verify new password works
    success_login = client.post(
        "/api/auth/login",
        json={"email": "priya.patel.otp@customgift.dev", "password": "NewStrongPassword456"},
    )
    assert success_login.status_code == 200


def test_anti_enumeration_protection(client):
    # Non-existent user returns generic 200 without revealing account absence
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "nonexistent.account.xyz@customgift.dev"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "If an account exists with this email" in data["message"]
    assert "dev_otp" not in data


def test_otp_attempt_limits_and_brute_force_protection(client, db):
    client.post(
        "/api/auth/register",
        json={
            "name": "Kavita Rao",
            "email": "kavita.limits@customgift.dev",
            "password": "Password123",
        },
    )

    with patch("app.api.auth.send_password_reset_otp_email", return_value=True) as mock_send:
        forgot_res = client.post(
            "/api/auth/forgot-password",
            json={"email": "kavita.limits@customgift.dev"},
        )
        assert forgot_res.status_code == 200
        otp_code = mock_send.call_args[0][1]

    # Send 4 invalid attempts
    for i in range(1, 5):
        bad_res = client.post(
            "/api/auth/verify-reset-otp",
            json={
                "email": "kavita.limits@customgift.dev",
                "otp": "999999",
            },
        )
        assert bad_res.status_code == 400
        assert f"{5 - i} attempt" in bad_res.json()["detail"]

    # 5th invalid attempt should lock out the OTP
    fifth_res = client.post(
        "/api/auth/verify-reset-otp",
        json={
            "email": "kavita.limits@customgift.dev",
            "otp": "999999",
        },
    )
    assert fifth_res.status_code == 400
    assert "Too many failed attempts" in fifth_res.json()["detail"]

    # Even the correct OTP is now rejected because it was invalidated
    locked_res = client.post(
        "/api/auth/verify-reset-otp",
        json={
            "email": "kavita.limits@customgift.dev",
            "otp": otp_code,
        },
    )
    assert locked_res.status_code == 400
    assert "Invalid or expired" in locked_res.json()["detail"]


def test_otp_expiry_handling(client, db):
    client.post(
        "/api/auth/register",
        json={
            "name": "Rohan Verma",
            "email": "rohan.expiry@customgift.dev",
            "password": "Password123",
        },
    )

    with patch("app.api.auth.send_password_reset_otp_email", return_value=True) as mock_send:
        forgot_res = client.post(
            "/api/auth/forgot-password",
            json={"email": "rohan.expiry@customgift.dev"},
        )
        otp_code = mock_send.call_args[0][1]

    # Manually expire the OTP in the database
    user = db.query(User).filter(User.email == "rohan.expiry@customgift.dev").first()
    otp_row = (
        db.query(PasswordResetOTP)
        .filter(PasswordResetOTP.user_id == user.id)
        .order_by(PasswordResetOTP.id.desc())
        .first()
    )
    otp_row.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)
    db.commit()

    # Attempting to verify expired OTP
    verify_res = client.post(
        "/api/auth/verify-reset-otp",
        json={
            "email": "rohan.expiry@customgift.dev",
            "otp": otp_code,
        },
    )
    assert verify_res.status_code == 400
    assert "expired" in verify_res.json()["detail"]


def test_cannot_reuse_same_password_during_reset(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "Aarav Sharma",
            "email": "aarav.samepass@customgift.dev",
            "password": "InitialPassword123",
        },
    )

    with patch("app.api.auth.send_password_reset_otp_email", return_value=True) as mock_send:
        forgot_res = client.post(
            "/api/auth/forgot-password",
            json={"email": "aarav.samepass@customgift.dev"},
        )
        otp_code = mock_send.call_args[0][1]

    verify_res = client.post(
        "/api/auth/verify-reset-otp",
        json={
            "email": "aarav.samepass@customgift.dev",
            "otp": otp_code,
        },
    )
    reset_token = verify_res.json()["reset_token"]

    # Attempting to reset to the same password
    reset_res = client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": reset_token,
            "new_password": "InitialPassword123",
            "confirm_password": "InitialPassword123",
        },
    )
    assert reset_res.status_code == 400
    assert "must be different from your current password" in reset_res.json()["detail"]


def test_smtp_unconfigured_error(client):
    # When SMTP is not configured, API must return HTTP 503 with setup instructions
    with patch.object(settings, "smtp_host", None):
        res = client.post(
            "/api/auth/forgot-password",
            json={"email": "anyone@customgift.dev"},
        )
        assert res.status_code == 503
        assert "not configured" in res.json()["detail"]


def test_email_delivery_failure_handling(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "Meera Joshi",
            "email": "meera.fail@customgift.dev",
            "password": "Password123",
        },
    )

    # When SMTP sending fails, API must report error and not claim success
    with patch("app.api.auth.send_password_reset_otp_email", return_value=False):
        res = client.post(
            "/api/auth/forgot-password",
            json={"email": "meera.fail@customgift.dev"},
        )
        assert res.status_code == 500
        assert "Unable to send verification email" in res.json()["detail"]


def test_resend_invalidates_previous_otp_and_provides_fresh_validity(client, db):
    client.post(
        "/api/auth/register",
        json={
            "name": "Dev Resend",
            "email": "dev.resend@customgift.dev",
            "password": "Password123",
        },
    )

    # 1. Request first OTP
    with patch("app.api.auth.send_password_reset_otp_email", return_value=True) as mock_send_1:
        res1 = client.post(
            "/api/auth/forgot-password",
            json={"email": "dev.resend@customgift.dev"},
        )
        assert res1.status_code == 200
        otp_1 = mock_send_1.call_args[0][1]

    # Verify cooldown blocks immediate resend
    resend_cooldown = client.post(
        "/api/auth/resend-reset-otp",
        json={"email": "dev.resend@customgift.dev"},
    )
    assert resend_cooldown.status_code == 429
    assert "seconds before requesting" in resend_cooldown.json()["detail"]

    # 2. Simulate 61 seconds passing by updating the created_at of the first OTP
    user = db.query(User).filter(User.email == "dev.resend@customgift.dev").first()
    first_otp_record = (
        db.query(PasswordResetOTP)
        .filter(PasswordResetOTP.user_id == user.id)
        .order_by(PasswordResetOTP.id.desc())
        .first()
    )
    first_otp_record.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=65)
    db.commit()

    # 3. Request Resend OTP
    with patch("app.api.auth.send_password_reset_otp_email", return_value=True) as mock_send_2:
        res2 = client.post(
            "/api/auth/resend-reset-otp",
            json={"email": "dev.resend@customgift.dev"},
        )
        assert res2.status_code == 200
        otp_2 = mock_send_2.call_args[0][1]

    # Verify first OTP was marked used/invalidated in DB
    db.refresh(first_otp_record)
    assert first_otp_record.is_used is True

    # 4. Attempt to verify OLD OTP (otp_1) -> Must be REJECTED
    verify_old = client.post(
        "/api/auth/verify-reset-otp",
        json={
            "email": "dev.resend@customgift.dev",
            "otp": otp_1,
        },
    )
    assert verify_old.status_code == 400
    assert "Invalid" in verify_old.json()["detail"] or "expired" in verify_old.json()["detail"]

    # 5. Verify NEW OTP (otp_2) -> Must SUCCEED
    verify_new = client.post(
        "/api/auth/verify-reset-otp",
        json={
            "email": "dev.resend@customgift.dev",
            "otp": otp_2,
        },
    )
    assert verify_new.status_code == 200
    reset_token = verify_new.json()["reset_token"]
    assert reset_token is not None

    # 6. Complete password reset with the new token
    reset_res = client.post(
        "/api/auth/reset-password",
        json={
            "reset_token": reset_token,
            "new_password": "NewResendPass789",
            "confirm_password": "NewResendPass789",
        },
    )
    assert reset_res.status_code == 200

    # 7. Old password rejected, new password works
    assert client.post(
        "/api/auth/login",
        json={"email": "dev.resend@customgift.dev", "password": "Password123"},
    ).status_code == 401

    assert client.post(
        "/api/auth/login",
        json={"email": "dev.resend@customgift.dev", "password": "NewResendPass789"},
    ).status_code == 200

