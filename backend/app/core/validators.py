import re
import unicodedata

# Strict, standards-compliant email validation regex
# RFC 5321 / 5322 compliant without over-restriction:
# Local part: alphanumeric and specific characters .!#$%&'*+/=?^_`{|}~-
# Domain: alphanumeric labels separated by dots, each label 1-63 chars, TLD at least 2 alpha chars
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$"
)

# Indian mobile phone regex: optional +91 or 0 prefix followed by 10 digits starting with 6, 7, 8, or 9
# Accepts international E.164 phone numbers with leading '+' (8 to 15 digits)
PHONE_REGEX = re.compile(r"^(?:\+91|0)?[6-9]\d{9}$")
INTERNATIONAL_PHONE_REGEX = re.compile(r"^\+[1-9]\d{7,14}$")

# Indian Postal Index Number (PIN): 6 digits, first digit 1-9
PINCODE_REGEX = re.compile(r"^[1-9]\d{5}$")

# Disallowed control characters in general text (ASCII 0-31 except tab and newline where permitted, plus 127)
CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
CRLF_REGEX = re.compile(r"[\r\n]")


def validate_and_normalize_email(email: str) -> str:
    """
    Strict standards-aware email validation:
    - Rejects empty, whitespace-only, or control character laden emails.
    - Rejects CRLF characters to prevent header injection.
    - Rejects whitespace within the email string.
    - Rejects multiple email addresses (commas, semicolons).
    - Enforces system max length: 320 characters (local part max 64, domain max 255).
    - Validates email structure against standards-aware regex.
    - Trims leading/trailing whitespace and normalizes domain part to lowercase.
    """
    if not email or not isinstance(email, str):
        raise ValueError("Email address is required")

    if CRLF_REGEX.search(email):
        raise ValueError("Email address must not contain newline or carriage return characters")

    if CONTROL_CHAR_REGEX.search(email):
        raise ValueError("Email address contains invalid control characters")

    trimmed = email.strip()
    if not trimmed:
        raise ValueError("Email address cannot be empty")

    if "," in trimmed or ";" in trimmed:
        raise ValueError("Multiple email addresses are not permitted")

    if any(c.isspace() for c in trimmed):
        raise ValueError("Email address must not contain spaces or whitespace")

    if len(trimmed) > 320:
        raise ValueError("Email address exceeds maximum permitted length of 320 characters")

    parts = trimmed.split("@")
    if len(parts) != 2:
        raise ValueError("Email address must contain exactly one '@' symbol")

    local_part, domain_part = parts
    if not local_part or not domain_part:
        raise ValueError("Invalid email format: missing local or domain part")

    if len(local_part) > 64:
        raise ValueError("Email local part exceeds maximum length of 64 characters")

    if len(domain_part) > 255:
        raise ValueError("Email domain part exceeds maximum length of 255 characters")

    # Reject consecutive dots in local or domain part
    if ".." in local_part or ".." in domain_part:
        raise ValueError("Email must not contain consecutive dots")

    if local_part.startswith(".") or local_part.endswith("."):
        raise ValueError("Email local part cannot start or end with a dot")

    if domain_part.startswith(".") or domain_part.endswith("."):
        raise ValueError("Email domain part cannot start or end with a dot")

    if not EMAIL_REGEX.match(trimmed):
        raise ValueError("Invalid email address format")

    # Normalize domain to lowercase
    return f"{local_part}@{domain_part.lower()}"


def validate_and_normalize_phone(phone: str | None) -> str | None:
    """
    Validates and normalizes phone numbers.
    Supports Indian mobile numbers (+91 or 10-digit 6-9) and standard E.164.
    """
    if phone is None:
        return None

    if not isinstance(phone, str):
        raise ValueError("Phone number must be a string")

    if CRLF_REGEX.search(phone) or CONTROL_CHAR_REGEX.search(phone):
        raise ValueError("Phone number contains invalid characters")

    cleaned = phone.strip()
    if not cleaned:
        return None

    # Strip allowed visual formatting separators: spaces, hyphens, brackets
    digits_and_plus = re.sub(r"[\s\-\(\)\.]", "", cleaned)

    if not digits_and_plus:
        raise ValueError("Phone number cannot be empty")

    # Validate against Indian phone regex or international E.164
    if PHONE_REGEX.match(digits_and_plus):
        # Normalize to standard 10-digit or +91 format
        if digits_and_plus.startswith("+91"):
            return digits_and_plus
        if digits_and_plus.startswith("0"):
            return f"+91{digits_and_plus[1:]}"
        return f"+91{digits_and_plus}"

    if INTERNATIONAL_PHONE_REGEX.match(digits_and_plus):
        return digits_and_plus

    raise ValueError("Invalid phone number format. Provide a valid 10-digit Indian mobile number or international number.")


def validate_pincode(pincode: str) -> str:
    """
    Validates Indian 6-digit Postal Index Number (PIN).
    """
    if not pincode or not isinstance(pincode, str):
        raise ValueError("PIN code is required")

    cleaned = pincode.strip()
    if not PINCODE_REGEX.match(cleaned):
        raise ValueError("Invalid PIN code. Must be a valid 6-digit Indian postal code.")

    return cleaned


def validate_clean_text(
    value: str,
    field_name: str,
    min_length: int = 1,
    max_length: int = 500,
    allow_newlines: bool = False,
) -> str:
    """
    Validates general user-submitted text:
    - Normalizes Unicode (NFC).
    - Checks min and max length bounds after trimming.
    - Rejects disallowed control characters and CRLF injection (if newlines disabled).
    """
    if value is None:
        raise ValueError(f"{field_name} is required")

    normalized = unicodedata.normalize("NFC", str(value)).strip()

    if len(normalized) < min_length:
        raise ValueError(f"{field_name} must be at least {min_length} characters")

    if len(normalized) > max_length:
        raise ValueError(f"{field_name} cannot exceed {max_length} characters")

    if not allow_newlines and CRLF_REGEX.search(normalized):
        raise ValueError(f"{field_name} must not contain newline characters")

    if CONTROL_CHAR_REGEX.search(normalized):
        raise ValueError(f"{field_name} contains invalid control characters")

    return normalized


def validate_password_strength(password: str) -> str:
    """
    Enforces password complexity:
    - Min 8 chars, Max 128 chars.
    - At least one uppercase letter, one lowercase letter, one numeric digit.
    - No silent modification of password bytes.
    """
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")

    if len(password) > 128:
        raise ValueError("Password cannot exceed 128 characters")

    if not any(c.isupper() for c in password):
        raise ValueError("Password must include at least one uppercase letter")

    if not any(c.islower() for c in password):
        raise ValueError("Password must include at least one lowercase letter")

    if not any(c.isdigit() for c in password):
        raise ValueError("Password must include at least one numeric digit")

    return password
