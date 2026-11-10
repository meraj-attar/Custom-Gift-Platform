import pytest
from app.core.validators import (
    validate_and_normalize_email,
    validate_and_normalize_phone,
    validate_clean_text,
    validate_password_strength,
    validate_pincode,
)


# ============================================================
# EMAIL VALIDATION TESTS
# ============================================================

def test_valid_email_normalization():
    assert validate_and_normalize_email("User.Name@Example.COM") == "User.Name@example.com"
    assert validate_and_normalize_email("customer+gift@store.co.in") == "customer+gift@store.co.in"
    assert validate_and_normalize_email("   test@customgift.dev   ") == "test@customgift.dev"


def test_reject_email_excessive_length():
    # Over 320 total
    long_email = "a" * 315 + "@example.com"
    with pytest.raises(ValueError, match="320 characters"):
        validate_and_normalize_email(long_email)

    # Local part over 64
    long_local = "a" * 65 + "@example.com"
    with pytest.raises(ValueError, match="64 characters"):
        validate_and_normalize_email(long_local)


def test_reject_email_whitespace_and_control_chars():
    with pytest.raises(ValueError, match="spaces or whitespace"):
        validate_and_normalize_email("user name@example.com")

    with pytest.raises(ValueError, match="control characters"):
        validate_and_normalize_email("user\x00@example.com")


def test_reject_email_crlf_injection():
    with pytest.raises(ValueError, match="newline or carriage return"):
        validate_and_normalize_email("victim@example.com\r\nBcc: attacker@example.com")

    with pytest.raises(ValueError, match="newline or carriage return"):
        validate_and_normalize_email("user\n@example.com")


def test_reject_multiple_emails():
    with pytest.raises(ValueError, match="Multiple email addresses"):
        validate_and_normalize_email("user1@example.com, user2@example.com")

    with pytest.raises(ValueError, match="Multiple email addresses"):
        validate_and_normalize_email("user1@example.com; user2@example.com")


def test_reject_malformed_emails():
    invalid_samples = [
        "",
        "   ",
        "not-an-email",
        "@missinglocal.com",
        "missingdomain@",
        "user@@doubleat.com",
        "user@domain..com",
        ".starts-with-dot@example.com",
        "ends-with-dot.@example.com",
        "user@.com",
    ]
    for sample in invalid_samples:
        with pytest.raises(ValueError):
            validate_and_normalize_email(sample)


# ============================================================
# PHONE VALIDATION TESTS
# ============================================================

def test_valid_indian_and_international_phones():
    assert validate_and_normalize_phone("9876543210") == "+919876543210"
    assert validate_and_normalize_phone("+919876543210") == "+919876543210"
    assert validate_and_normalize_phone("09876543210") == "+919876543210"
    assert validate_and_normalize_phone("+14155552671") == "+14155552671"
    assert validate_and_normalize_phone("  +91 98765-43210  ") == "+919876543210"
    assert validate_and_normalize_phone(None) is None


def test_reject_invalid_phones():
    invalid_phones = [
        "12345",              # too short
        "98765abcde",         # letters
        "9876543210\r\n",     # CRLF
        "1234567890",         # Indian mobile must start with 6-9
    ]
    for sample in invalid_phones:
        with pytest.raises(ValueError):
            validate_and_normalize_phone(sample)


# ============================================================
# PIN CODE VALIDATION TESTS
# ============================================================

def test_valid_pincodes():
    assert validate_pincode("411001") == "411001"
    assert validate_pincode("110001") == "110001"
    assert validate_pincode(" 560001 ") == "560001"


def test_reject_invalid_pincodes():
    invalid_pins = [
        "011001",   # first digit cannot be 0
        "41100",    # 5 digits
        "4110011",  # 7 digits
        "41100A",   # alpha
        "",
        "   ",
    ]
    for sample in invalid_pins:
        with pytest.raises(ValueError):
            validate_pincode(sample)


# ============================================================
# TEXT AND NAME VALIDATION TESTS
# ============================================================

def test_valid_unicode_names():
    assert validate_clean_text("Amélie O'Connor-Smith", "Name") == "Amélie O'Connor-Smith"
    assert validate_clean_text("राकेश शर्मा", "Name") == "राकेश शर्मा"
    assert validate_clean_text("Dr. John Watson, Jr.", "Name") == "Dr. John Watson, Jr."


def test_reject_text_control_characters_and_crlf():
    with pytest.raises(ValueError, match="newline characters"):
        validate_clean_text("Line1\nLine2", "Name", allow_newlines=False)

    with pytest.raises(ValueError, match="control characters"):
        validate_clean_text("Hello\x00World", "Text")


# ============================================================
# PASSWORD COMPLEXITY TESTS
# ============================================================

def test_password_strength():
    assert validate_password_strength("ValidPass123!") == "ValidPass123!"

    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_strength("Short1A")

    with pytest.raises(ValueError, match="uppercase letter"):
        validate_password_strength("lowercase123")

    with pytest.raises(ValueError, match="lowercase letter"):
        validate_password_strength("UPPERCASE123")

    with pytest.raises(ValueError, match="numeric digit"):
        validate_password_strength("NoDigitsHere")


# ============================================================
# API INTEGRATION TESTS FOR VALIDATION & HEALTH
# ============================================================

def test_register_rejects_crlf_email(client):
    response = client.post("/api/auth/register", json={
        "name": "Attacker",
        "email": "victim@example.com\r\nBcc: evil@example.com",
        "password": "SecurePassword1",
    })
    assert response.status_code == 422


def test_register_rejects_spaces_in_email(client):
    response = client.post("/api/auth/register", json={
        "name": "Space User",
        "email": "user name@example.com",
        "password": "SecurePassword1",
    })
    assert response.status_code == 422


def test_health_and_readiness_probes(client):
    # Liveness check
    live_res = client.get("/health")
    assert live_res.status_code == 200
    assert live_res.json() == {"status": "ok"}

    # Readiness check (DB verified)
    ready_res = client.get("/health/ready")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"
    assert ready_res.json()["database"] == "connected"


def test_rate_limiting_enforcement(client):
    headers = {"X-Test-Rate-Limit": "true"}
    # Send 16 requests to /api/auth/login (limit is 15)
    responses = [
        client.post(
            "/api/auth/login",
            json={"email": f"test{i}@example.com", "password": "Password123"},
            headers=headers,
        )
        for i in range(16)
    ]
    # The 16th request must be rate limited (429)
    assert any(res.status_code == 429 for res in responses)
    rate_limited_res = [res for res in responses if res.status_code == 429][0]
    assert "Retry-After" in rate_limited_res.headers

