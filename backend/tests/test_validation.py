import pytest
from app.core.validators import (
    normalize_and_validate_indian_phone,
    validate_address,
    validate_and_normalize_email,
    validate_and_normalize_phone,
    validate_clean_text,
    validate_full_name,
    validate_password_strength,
    validate_pincode,
)


# ============================================================
# FULL NAME VALIDATION TESTS
# ============================================================

def test_valid_full_name():
    assert validate_full_name("Aarav Sharma") == "Aarav Sharma"
    assert validate_full_name("Priya Patel") == "Priya Patel"
    assert validate_full_name("Dr. A. P. J. Abdul Kalam") == "Dr. A. P. J. Abdul Kalam"
    assert validate_full_name("Jean-Luc O'Connor") == "Jean-Luc O'Connor"
    assert validate_full_name("राजेश कुमार") == "राजेश कुमार"


def test_reject_invalid_full_name():
    # Empty and whitespace
    with pytest.raises(ValueError, match="required"):
        validate_full_name("")
    with pytest.raises(ValueError, match="required"):
        validate_full_name("   ")

    # Min length < 2
    with pytest.raises(ValueError, match="at least 2 characters"):
        validate_full_name("A")

    # Max length > 100
    with pytest.raises(ValueError, match="cannot exceed 100 characters"):
        validate_full_name("A" * 101)

    # Numbers
    with pytest.raises(ValueError, match="cannot contain numbers"):
        validate_full_name("John123")
    with pytest.raises(ValueError, match="cannot contain numbers"):
        validate_full_name("Aarav 99")

    # Excessive special characters / no letters
    with pytest.raises(ValueError, match="at least 2 letters"):
        validate_full_name("!@#$%^&*")
    with pytest.raises(ValueError, match="at least 2 letters"):
        validate_full_name("---")
    with pytest.raises(ValueError, match="invalid characters"):
        validate_full_name("Aarav 😀")


# ============================================================
# EMAIL VALIDATION TESTS
# ============================================================

def test_valid_email_normalization():
    assert validate_and_normalize_email("User.Name@Example.COM") == "User.Name@example.com"
    assert validate_and_normalize_email("customer+gift@store.co.in") == "customer+gift@store.co.in"
    assert validate_and_normalize_email("   test@customgift.dev   ") == "test@customgift.dev"


def test_reject_email_excessive_length():
    # Over 254 total (255 characters)
    long_email = "a" * 243 + "@example.com"
    assert len(long_email) == 255
    with pytest.raises(ValueError, match="254 characters"):
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


def test_normalize_and_validate_indian_phone_specific():
    assert normalize_and_validate_indian_phone("9876543210") == "+919876543210"
    assert normalize_and_validate_indian_phone("+91 98765 43210") == "+919876543210"
    assert normalize_and_validate_indian_phone("09876543210") == "+919876543210"
    assert normalize_and_validate_indian_phone(None) is None
    assert normalize_and_validate_indian_phone("   ") is None

    with pytest.raises(ValueError, match="only digits"):
        normalize_and_validate_indian_phone("98765abcde")

    with pytest.raises(ValueError, match="10-digit Indian mobile"):
        normalize_and_validate_indian_phone("1234567890")

    with pytest.raises(ValueError, match="10-digit Indian mobile"):
        normalize_and_validate_indian_phone("98765")


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
# ADDRESS VALIDATION TESTS
# ============================================================

def test_valid_address():
    assert validate_address("Flat 402, Sunshine Apts, M.G. Road, Pune - 411001") == "Flat 402, Sunshine Apts, M.G. Road, Pune - 411001"
    assert validate_address(None) is None
    assert validate_address("   ") is None


def test_reject_invalid_address():
    with pytest.raises(ValueError, match="cannot exceed 500 characters"):
        validate_address("A" * 501)
    with pytest.raises(ValueError, match="control characters"):
        validate_address("Flat 101 \x00 NullByte St")


# ============================================================
# PIN CODE VALIDATION TESTS
# ============================================================

def test_valid_pincodes():
    assert validate_pincode("411001") == "411001"
    assert validate_pincode("110001") == "110001"
    assert validate_pincode(" 560001 ") == "560001"


def test_reject_invalid_pincodes():
    invalid_pins = [
        "",
        "011001",   # cannot start with 0
        "41100",    # 5 digits
        "4110011",  # 7 digits
        "41100A",   # alpha
        "411 01",   # space within
    ]
    for pin in invalid_pins:
        with pytest.raises(ValueError):
            validate_pincode(pin)


# ============================================================
# PASSWORD STRENGTH TESTS
# ============================================================

def test_valid_passwords():
    assert validate_password_strength("StrongPass123") == "StrongPass123"
    assert validate_password_strength("P@ssw0rd!Secure") == "P@ssw0rd!Secure"
    assert validate_password_strength("A" * 126 + "b1") == "A" * 126 + "b1"


def test_reject_weak_passwords():
    # Too short
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_strength("Short1A")

    # Too long (> 128)
    with pytest.raises(ValueError, match="cannot exceed 128 characters"):
        validate_password_strength("A" * 127 + "b1X")

    # Missing uppercase
    with pytest.raises(ValueError, match="uppercase"):
        validate_password_strength("lowercase123")

    # Missing lowercase
    with pytest.raises(ValueError, match="lowercase"):
        validate_password_strength("UPPERCASE123")

    # Missing digit
    with pytest.raises(ValueError, match="digit"):
        validate_password_strength("NoNumbersHere")


# ============================================================
# HEALTH & PROBES TESTS
# ============================================================

def test_health_probes(client):
    live_res = client.get("/health")
    assert live_res.status_code == 200
    assert live_res.json() == {"status": "ok"}

    ready_res = client.get("/health/ready")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"
    assert ready_res.json()["database"] == "connected"


def test_rate_limiting_enforcement(client):
    headers = {"X-Test-Rate-Limit": "true"}
    responses = [
        client.post(
            "/api/auth/login",
            json={"email": f"test{i}@example.com", "password": "Password123"},
            headers=headers,
        )
        for i in range(16)
    ]
    assert any(res.status_code == 429 for res in responses)
    rate_limited_res = [res for res in responses if res.status_code == 429][0]
    assert "Retry-After" in rate_limited_res.headers
