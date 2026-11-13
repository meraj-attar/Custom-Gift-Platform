import hmac
import logging
from datetime import datetime, timedelta, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from jwt import InvalidTokenError
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_token,
    generate_otp,
    generate_recovery_code,
    generate_reset_token,
    hash_otp,
    hash_password,
    hash_recovery_code,
    hash_reset_token,
    password_reset_fingerprint,
    verify_otp,
    verify_password,
)
from app.dependencies.auth import get_current_user
from app.models import PasswordResetOTP, User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RecoveryRegenerateRequest,
    RecoveryRegenerateResponse,
    RecoveryResetRequest,
    RecoveryStatusResponse,
    RecoveryVerifyRequest,
    RecoveryVerifyResponse,
    ResendOTPRequest,
    ResetPasswordRequest,
    ResetPasswordWithTokenRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserLogin,
    UserPublic,
    UserRegister,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.schemas.common import MessageResponse
from app.services.email_service import (
    send_password_reset_email,
    send_password_reset_otp_email,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()

    existing_user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An account with this email address already exists. "
                "Please sign in or use a different email."
            ),
        )

    # Generate a cryptographically secure recovery code (CG-XXXX-XXXX-XXXX-XXXX)
    recovery_code = generate_recovery_code()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(
            payload.password
        ),
        phone=payload.phone,
        address=payload.address,
        role="customer",
        recovery_code_hash=hash_recovery_code(recovery_code),
        recovery_code_created_at=now_utc,
        recovery_code_used=False,
        token_version=1,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(
            user.id,
            user.role,
        ),
        user=user,
        recovery_code=recovery_code,
    )


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()

    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if (
        not user
        or not verify_password(
            payload.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is disabled. Please contact customer support.",
        )

    return TokenResponse(
        access_token=create_access_token(
            user.id,
            user.role,
        ),
        user=user,
    )


# ============================================================
# CURRENT USER
# ============================================================

@router.get(
    "/me",
    response_model=UserPublic,
)
def me(
    current_user: User = Depends(
        get_current_user
    ),
):
    return current_user


@router.put(
    "/me",
    response_model=UserPublic,
)
def update_me(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile details for the authenticated user."""
    current_user.name = payload.name
    current_user.phone = payload.phone
    current_user.address = payload.address
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password for the authenticated user."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )

    current_user.password_hash = hash_password(payload.new_password)
    current_user.token_version = (current_user.token_version or 1) + 1
    db.commit()
    return {"message": "Password changed successfully."}


# ============================================================
# 6-DIGIT EMAIL OTP PASSWORD RECOVERY SYSTEM
# ============================================================

@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Step 1: Request 6-digit Email OTP for password recovery.
    - Generates a cryptographically secure 6-digit OTP.
    - Enforces 60-second cooldown per account.
    - Invalidates existing unverified OTPs.
    - Expires after 5 minutes.
    - Dispatches branded email via standard SMTP.
    - Uses anti-enumeration defense.
    """
    if not settings.smtp_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery service is currently not configured on this server. Please configure SMTP settings (SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL) in the server environment.",
        )

    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if user and user.is_active:
        # Enforce 60-second resend cooldown
        recent_otp = db.scalar(
            select(PasswordResetOTP)
            .where(PasswordResetOTP.user_id == user.id)
            .order_by(PasswordResetOTP.id.desc())
        )
        if recent_otp and recent_otp.created_at:
            elapsed = (now - recent_otp.created_at).total_seconds()
            if elapsed < 60:
                remaining = max(1, int(60 - elapsed))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining} seconds before requesting a new verification code.",
                )

        # Invalidate previous unused OTPs
        db.execute(
            update(PasswordResetOTP)
            .where(PasswordResetOTP.user_id == user.id, PasswordResetOTP.is_used.is_(False))
            .values(is_used=True)
        )

        # Clean up expired OTP records older than 24 hours
        db.execute(
            delete(PasswordResetOTP).where(
                PasswordResetOTP.user_id == user.id,
                PasswordResetOTP.expires_at < now - timedelta(hours=24),
            )
        )

        # Generate 6-digit numeric OTP
        otp = generate_otp(6)
        otp_hash = hash_otp(otp)
        expires_at = now + timedelta(minutes=5)

        otp_record = PasswordResetOTP(
            user_id=user.id,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            is_used=False,
            created_at=now,
        )
        db.add(otp_record)
        db.commit()

        # Send SMTP email
        email_sent = send_password_reset_otp_email(user.email, otp, expires_minutes=5)
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to send verification email. Please try again later or contact support.",
            )
    else:
        # Constant-time dummy comparison to prevent user enumeration & timing attacks
        verify_otp("000000", "0" * 64)

    return ForgotPasswordResponse(
        message="If an account exists with this email, verification instructions have been sent.",
        cooldown_seconds=60,
        expires_in_minutes=5,
    )


@router.post(
    "/resend-reset-otp",
    response_model=ForgotPasswordResponse,
)
def resend_reset_otp(
    payload: ResendOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Resends 6-digit Email OTP with a strict 60-second cooldown.
    """
    if not settings.smtp_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery service is currently not configured on this server. Please configure SMTP settings (SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL) in the server environment.",
        )

    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if user and user.is_active:
        recent_otp = db.scalar(
            select(PasswordResetOTP)
            .where(PasswordResetOTP.user_id == user.id)
            .order_by(PasswordResetOTP.id.desc())
        )
        if recent_otp and recent_otp.created_at:
            elapsed = (now - recent_otp.created_at).total_seconds()
            if elapsed < 60:
                remaining = max(1, int(60 - elapsed))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining} seconds before requesting a new verification code.",
                )

        db.execute(
            update(PasswordResetOTP)
            .where(PasswordResetOTP.user_id == user.id, PasswordResetOTP.is_used.is_(False))
            .values(is_used=True)
        )

        # Clean up expired OTP records older than 24 hours
        db.execute(
            delete(PasswordResetOTP).where(
                PasswordResetOTP.user_id == user.id,
                PasswordResetOTP.expires_at < now - timedelta(hours=24),
            )
        )

        otp = generate_otp(6)
        otp_record = PasswordResetOTP(
            user_id=user.id,
            otp_hash=hash_otp(otp),
            expires_at=now + timedelta(minutes=5),
            attempts=0,
            is_used=False,
            created_at=now,
        )
        db.add(otp_record)
        db.commit()

        email_sent = send_password_reset_otp_email(user.email, otp, expires_minutes=5)
        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to send verification email. Please try again later or contact support.",
            )
    else:
        verify_otp("000000", "0" * 64)

    return ForgotPasswordResponse(
        message="If an account exists with this email, verification instructions have been sent.",
        cooldown_seconds=60,
        expires_in_minutes=5,
    )


@router.post(
    "/verify-reset-otp",
    response_model=VerifyOTPResponse,
)
def verify_reset_otp(
    payload: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Step 2: Verify 6-digit Email OTP.
    - Validates against stored hash.
    - Limits to maximum 5 attempts to prevent brute force attacks.
    - Enforces 5-minute expiry.
    - Upon success, burns OTP and returns a 15-minute single-use reset token.
    """
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if not user or not user.is_active:
        verify_otp(payload.otp, "0" * 64)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    otp_record = db.scalar(
        select(PasswordResetOTP)
        .where(PasswordResetOTP.user_id == user.id, PasswordResetOTP.is_used.is_(False))
        .order_by(PasswordResetOTP.id.desc())
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new code.",
        )

    # Check maximum attempt limit
    if otp_record.attempts >= 5:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. This verification code has been invalidated. Please request a new code.",
        )

    # Check expiration (5 minutes)
    if otp_record.expires_at < now:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has expired. Please request a new code.",
        )

    # Check matching OTP hash
    if not verify_otp(payload.otp, otp_record.otp_hash):
        otp_record.attempts += 1
        attempts_left = max(0, 5 - otp_record.attempts)
        if attempts_left == 0:
            otp_record.is_used = True
        db.commit()

        if attempts_left > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {attempts_left} attempt{'s' if attempts_left != 1 else ''} remaining.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. This verification code has been invalidated. Please request a new code.",
        )

    # OTP is valid! Consume it
    otp_record.is_used = True

    # Generate single-use reset token valid for 15 minutes
    raw_token = generate_reset_token()
    user.reset_token_hash = hash_reset_token(raw_token)
    user.reset_token_expires_at = now + timedelta(minutes=15)
    db.commit()

    return VerifyOTPResponse(
        message="Verification code confirmed successfully.",
        reset_token=raw_token,
        expires_in_minutes=15,
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
def reset_password(
    payload: ResetPasswordWithTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Step 3: Reset password with verified reset token.
    - Validates token against database hash or legacy JWT.
    - Enforces password strength & mismatch validations.
    - Prevents reusing current password.
    - Invalidates token and burns sessions by incrementing token_version.
    """
    token = payload.reset_token.strip()
    token_hash = hash_reset_token(token)

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Look up user by reset_token_hash
    user = db.scalar(select(User).where(User.reset_token_hash == token_hash))

    # 2. Backward compatibility fallback for legacy JWT reset links
    if not user or not user.is_active:
        try:
            token_data = decode_token(token, "password_reset")
            user_id = int(token_data["sub"])
            user = db.get(User, user_id)
        except Exception:
            user = None

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset session. Please request a new verification code.",
            )

    # Check token expiry
    if user.reset_token_expires_at and user.reset_token_expires_at < now:
        user.reset_token_hash = None
        user.reset_token_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your password reset session has expired. Please verify your code again.",
        )

    # Prevent resetting to the identical current password
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )

    # Update password and invalidate reset token & active JWTs
    user.password_hash = hash_password(payload.new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    user.token_version = (user.token_version or 1) + 1

    db.commit()

    return MessageResponse(
        message="Your password has been reset successfully. Please sign in with your new password."
    )



# ============================================================
# SELF-HOSTED RECOVERY SYSTEM (NO 3RD PARTY APIS)
# ============================================================

@router.post(
    "/recovery/verify",
    response_model=RecoveryVerifyResponse,
)
def verify_recovery_code(
    payload: RecoveryVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Verifies the email and recovery code.
    Mitigates user enumeration and timing attacks.
    On success, creates a single-use 10-minute reset session token.
    """
    email = payload.email.lower().strip()
    code_hash = hash_recovery_code(payload.recovery_code)

    user = db.scalar(
        select(User).where(User.email == email)
    )

    # Protect against user enumeration / timing attacks
    if not user or not user.is_active or not user.recovery_code_hash or user.recovery_code_used:
        hmac.compare_digest(code_hash, "0" * 64)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or recovery code. Please check your credentials and try again.",
        )

    if not hmac.compare_digest(code_hash, user.recovery_code_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or recovery code. Please check your credentials and try again.",
        )

    # Issue single-use reset token valid for 10 minutes
    raw_token = generate_reset_token()
    user.reset_token_hash = hash_reset_token(raw_token)
    user.reset_token_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10)

    db.commit()

    return RecoveryVerifyResponse(
        reset_token=raw_token,
        message="Recovery code verified successfully.",
        expires_in_minutes=10,
    )


@router.post(
    "/recovery/reset",
    response_model=MessageResponse,
)
def reset_password_with_recovery(
    payload: RecoveryResetRequest,
    db: Session = Depends(get_db),
):
    """
    Consumes the single-use reset token and updates the user's password.
    Invalidates the recovery code so it cannot be reused.
    Increments token_version to invalidate existing JWT sessions.
    """
    token_hash = hash_reset_token(payload.reset_token)

    user = db.scalar(
        select(User).where(User.reset_token_hash == token_hash)
    )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset session. Please verify your recovery code again.",
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not user.reset_token_expires_at or user.reset_token_expires_at < now:
        user.reset_token_hash = None
        user.reset_token_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset session has expired. Please verify your recovery code again.",
        )

    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )

    # Update password and consume token
    user.password_hash = hash_password(payload.new_password)
    user.recovery_code_used = True
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    user.token_version = (user.token_version or 1) + 1

    db.commit()

    return MessageResponse(
        message="Your password has been reset successfully. Please sign in with your new password."
    )


@router.post(
    "/recovery/regenerate",
    response_model=RecoveryRegenerateResponse,
)
def regenerate_recovery_code(
    payload: RecoveryRegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Allows an authenticated user to generate a new recovery code by confirming their password.
    Useful for existing accounts created prior to recovery codes or when a code was previously consumed.
    """
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password.",
        )

    new_code = generate_recovery_code()
    current_user.recovery_code_hash = hash_recovery_code(new_code)
    current_user.recovery_code_created_at = datetime.now(timezone.utc).replace(tzinfo=None)
    current_user.recovery_code_used = False

    db.commit()

    return RecoveryRegenerateResponse(
        recovery_code=new_code,
        message="New recovery code generated successfully. Keep it in a safe place.",
    )


@router.get(
    "/recovery/status",
    response_model=RecoveryStatusResponse,
)
def get_recovery_status(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the recovery code status for the logged-in user.
    """
    return RecoveryStatusResponse(
        has_recovery_code=bool(current_user.recovery_code_hash),
        is_used=bool(current_user.recovery_code_used),
        created_at=current_user.recovery_code_created_at,
    )
