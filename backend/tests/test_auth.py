import pytest
from app.models import User
from app.core.security import hash_password


def test_register_login_and_me(client):
    register = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "Secure123",
        "phone": "9999999999",
        "address": "Pune",
    })
    assert register.status_code == 201
    token = register.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "test@example.com"

    login = client.post("/api/auth/login", json={"email": "test@example.com", "password": "Secure123"})
    assert login.status_code == 200
    assert login.json()["access_token"]
    assert login.json()["user"]["email"] == "test@example.com"


def test_duplicate_email_is_rejected(client):
    payload = {"name": "One User", "email": "same@example.com", "password": "Secure123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    res_dup = client.post("/api/auth/register", json=payload)
    assert res_dup.status_code == 409
    assert "already exists" in res_dup.json()["detail"].lower()


def test_registration_validation_rules_direct_api(client, db):
    base = {
        "name": "Aarav Sharma",
        "email": "aarav@example.com",
        "password": "StrongPassword123!",
        "phone": "+91 98765-43210",
        "address": "402 MG Road, Pune",
    }

    # 1. Valid registration
    res_valid = client.post("/api/auth/register", json=base)
    assert res_valid.status_code == 201
    data = res_valid.json()
    assert data["user"]["name"] == "Aarav Sharma"
    assert data["user"]["phone"] == "+919876543210"

    # Verify password is stored as scrypt hash, never plain text
    saved_user = db.query(User).filter(User.email == "aarav@example.com").first()
    assert saved_user.password_hash.startswith("scrypt$")
    assert "StrongPassword123!" not in saved_user.password_hash

    # 2. Reject numbers in name
    res_num_name = client.post("/api/auth/register", json={**base, "email": "num@example.com", "name": "Aarav 99"})
    assert res_num_name.status_code == 422

    # 3. Reject symbols-only name
    res_sym_name = client.post("/api/auth/register", json={**base, "email": "sym@example.com", "name": "!@#$%^"})
    assert res_sym_name.status_code == 422

    # 4. Reject name over 100 characters
    res_long_name = client.post("/api/auth/register", json={**base, "email": "longn@example.com", "name": "A" * 101})
    assert res_long_name.status_code == 422

    # 5. Reject invalid phone (letters)
    res_bad_phone = client.post("/api/auth/register", json={**base, "email": "badp@example.com", "phone": "98765abcde"})
    assert res_bad_phone.status_code == 422

    # 6. Reject invalid phone length
    res_short_phone = client.post("/api/auth/register", json={**base, "email": "shortp@example.com", "phone": "98765"})
    assert res_short_phone.status_code == 422

    # 7. Reject weak password (missing digit, lowercase, etc.)
    res_weak_pw = client.post("/api/auth/register", json={**base, "email": "weakpw@example.com", "password": "alllowercase"})
    assert res_weak_pw.status_code == 422

    # 8. Reject password over 128 characters
    res_long_pw = client.post("/api/auth/register", json={**base, "email": "longpw@example.com", "password": "A" * 127 + "b1!"})
    assert res_long_pw.status_code == 422

    # 9. Reject address over 500 characters
    res_long_addr = client.post("/api/auth/register", json={**base, "email": "longaddr@example.com", "address": "A" * 501})
    assert res_long_addr.status_code == 422


def test_login_empty_inputs_rejected(client):
    res_empty_email = client.post("/api/auth/login", json={"email": "", "password": "ValidPass123"})
    assert res_empty_email.status_code == 422

    res_empty_pass = client.post("/api/auth/login", json={"email": "user@example.com", "password": ""})
    assert res_empty_pass.status_code == 422


def test_login_invalid_email_format(client):
    for bad_email in ["not-an-email", "user@domain", "user@@domain.com", "user name@domain.com"]:
        res = client.post("/api/auth/login", json={"email": bad_email, "password": "ValidPass123"})
        assert res.status_code == 422


def test_login_boundaries_email_and_password(client, db):
    # Register an active user with 128-char password
    pw_128 = "A" + "b" * 126 + "1"
    assert len(pw_128) == 128

    user = User(
        name="Boundary User",
        email="boundary@example.com",
        password_hash=hash_password(pw_128),
        is_active=True,
    )
    db.add(user)
    db.commit()

    # Valid 128-char password succeeds
    login_128 = client.post("/api/auth/login", json={"email": "boundary@example.com", "password": pw_128})
    assert login_128.status_code == 200

    # 129-char password rejected by schema validation (422)
    pw_129 = pw_128 + "x"
    assert len(pw_129) == 129
    login_129 = client.post("/api/auth/login", json={"email": "boundary@example.com", "password": pw_129})
    assert login_129.status_code == 422

    # Email length 255 rejected by schema validation (422)
    email_255 = "a" * 243 + "@example.com"
    assert len(email_255) == 255
    res_255 = client.post("/api/auth/login", json={"email": email_255, "password": "SomePassword123"})
    assert res_255.status_code == 422


def test_login_security_no_user_enumeration(client, db):
    # Active user
    user = User(
        name="Existing User",
        email="existing@example.com",
        password_hash=hash_password("RealPassword123"),
        is_active=True,
    )
    db.add(user)
    db.commit()

    # 1. Existing user with wrong password
    res_wrong_pw = client.post("/api/auth/login", json={"email": "existing@example.com", "password": "WrongPassword999"})
    assert res_wrong_pw.status_code == 401
    assert res_wrong_pw.json()["detail"] == "Invalid email or password"

    # 2. Unregistered user
    res_no_user = client.post("/api/auth/login", json={"email": "nonexistent@example.com", "password": "AnyPassword123"})
    assert res_no_user.status_code == 401
    assert res_no_user.json()["detail"] == "Invalid email or password"

    # Both responses are identical, preventing account enumeration
    assert res_wrong_pw.json() == res_no_user.json()


def test_login_disabled_account(client, db):
    disabled_user = User(
        name="Disabled User",
        email="disabled@example.com",
        password_hash=hash_password("ValidPassword123"),
        is_active=False,
    )
    db.add(disabled_user)
    db.commit()

    # Disabled account with correct credentials returns 403 Forbidden
    res = client.post("/api/auth/login", json={"email": "disabled@example.com", "password": "ValidPassword123"})
    assert res.status_code == 403
    assert "disabled" in res.json()["detail"].lower()

    # Disabled account with wrong credentials returns generic 401 (preventing enumeration)
    res_bad_pw = client.post("/api/auth/login", json={"email": "disabled@example.com", "password": "WrongPassword"})
    assert res_bad_pw.status_code == 401
    assert res_bad_pw.json()["detail"] == "Invalid email or password"


def test_login_rate_limiting(client):
    headers = {"X-Test-Rate-Limit": "true"}
    # Rule allows 15 requests per minute; 16th should fail with 429
    status_codes = []
    for _ in range(16):
        res = client.post(
            "/api/auth/login",
            json={"email": "rate_limit_test@example.com", "password": "WrongPassword123"},
            headers=headers,
        )
        status_codes.append(res.status_code)

    assert status_codes[-1] == 429
