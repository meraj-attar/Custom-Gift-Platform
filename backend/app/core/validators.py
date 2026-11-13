import re
import unicodedata

# Strict, standards-compliant email validation regex (RFC 5321/5322)
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$"
)

# Indian mobile phone regex: 10 digits starting with 6, 7, 8, or 9
INDIAN_MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")
PHONE_REGEX = re.compile(r"^(?:\+91|0)?[6-9]\d{9}$")
INTERNATIONAL_PHONE_REGEX = re.compile(r"^\+[1-9]\d{7,14}$")

# Indian Postal Index Number (PIN): 6 digits, first digit 1-9
PINCODE_REGEX = re.compile(r"^[1-9]\d{5}$")

# Disallowed control characters in general text (ASCII 0-31 except tab and newline where permitted, plus 127)
CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
CRLF_REGEX = re.compile(r"[\r\n]")


def validate_full_name(name: str) -> str:
    """
    Validates a user's full name:
    - Required field, 2 to 100 characters.
    - Allows legitimate Unicode letters (Latin, Devanagari, Tamil, etc.).
    - Allows spaces, hyphens, apostrophes, and periods (e.g., M. K. Gandhi, O'Connor).
    - Rejects digits, emojis, control characters, and symbols.
    - Requires at least 2 Unicode letters.
    """
    if name is None:
        raise ValueError("Full name is required")

    trimmed = unicodedata.normalize("NFC", str(name)).strip()
    if not trimmed:
        raise ValueError("Full name is required")

    if len(trimmed) < 2:
        raise ValueError("Full name must be at least 2 characters")

    if len(trimmed) > 100:
        raise ValueError("Full name cannot exceed 100 characters")

    if re.search(r"\d", trimmed):
        raise ValueError("Full name cannot contain numbers")

    if CRLF_REGEX.search(trimmed):
        raise ValueError("Full name must not contain newline characters")

    if CONTROL_CHAR_REGEX.search(trimmed):
        raise ValueError("Full name contains invalid control characters")

    # Count Unicode alphabetic letters
    letter_count = sum(1 for c in trimmed if c.isalpha())
    if letter_count < 2:
        raise ValueError("Full name must contain at least 2 letters")

    # Allowed characters: Unicode letters (L), combining marks/matras (M), spaces, hyphens, apostrophes, periods
    for c in trimmed:
        cat = unicodedata.category(c)
        if not (cat.startswith("L") or cat.startswith("M") or c in " .'-"):
            raise ValueError("Full name contains invalid characters. Use letters, spaces, hyphens, or apostrophes.")

    return trimmed


def validate_contact_name(name: str, min_length: int = 2, max_length: int = 80) -> str:
    """
    Validates a contact message submitter name:
    - Required field, 2 to 80 characters.
    - Allows Unicode letters, spaces, hyphens, and apostrophes.
    - Rejects whitespace-only values, numbers, newlines, and control characters.
    - Requires at least 2 alphabetic letters.
    """
    if name is None:
        raise ValueError("Name is required")

    trimmed = unicodedata.normalize("NFC", str(name)).strip()
    if not trimmed:
        raise ValueError("Name is required")

    if len(trimmed) < min_length:
        raise ValueError(f"Name must be at least {min_length} characters")

    if len(trimmed) > max_length:
        raise ValueError(f"Name cannot exceed {max_length} characters")

    if re.search(r"\d", trimmed):
        raise ValueError("Name cannot contain numbers")

    if CRLF_REGEX.search(trimmed):
        raise ValueError("Name must not contain newline characters")

    if CONTROL_CHAR_REGEX.search(trimmed):
        raise ValueError("Name contains invalid control characters")

    letter_count = sum(1 for c in trimmed if c.isalpha())
    if letter_count < min_length:
        raise ValueError(f"Name must contain at least {min_length} letters")

    for c in trimmed:
        cat = unicodedata.category(c)
        if not (cat.startswith("L") or cat.startswith("M") or c in " .'-"):
            raise ValueError("Name contains invalid characters. Use letters, spaces, hyphens, or apostrophes.")

    return trimmed


def normalize_and_validate_indian_phone(phone: str | None) -> str | None:
    """
    Validates and normalizes an optional Indian mobile number:
    - If provided, accepts digits with optional formatting: +91, 0, spaces, hyphens, parens.
    - Rejects alphabetic characters, symbols, and invalid lengths.
    - Normalizes to a standard Indian mobile number (+91XXXXXXXXXX) with exactly 10 national digits.
    """
    if phone is None:
        return None

    if CRLF_REGEX.search(phone) or CONTROL_CHAR_REGEX.search(phone):
        raise ValueError("Phone number contains invalid control characters")

    cleaned = phone.strip()
    if not cleaned:
        return None

    # Reject alphabetic characters or unexpected symbols
    if re.search(r"[^\d\s\-\(\)\+\.]", cleaned):
        raise ValueError("Phone number must contain only digits and valid phone formatting (+91, spaces, hyphens)")

    # Strip visual separators
    digits = re.sub(r"[\s\-\(\)\.]", "", cleaned)

    # Normalize prefixes: +91, 91 (if 12 digits), 0 (if 11 digits)
    if digits.startswith("+"):
        if not digits.startswith("+91"):
            raise ValueError("Only Indian mobile numbers (+91) are supported")
        digits = digits[3:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]

    if not INDIAN_MOBILE_REGEX.fullmatch(digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9")

    return f"+91{digits}"


def validate_and_normalize_phone(phone: str | None) -> str | None:
    """
    Validates general phone numbers, supporting Indian mobile and international E.164.
    """
    if phone is None:
        return None

    if not isinstance(phone, str):
        raise ValueError("Phone number must be a string")

    if CRLF_REGEX.search(phone) or CONTROL_CHAR_REGEX.search(phone):
        raise ValueError("Phone number contains invalid control characters")

    cleaned = phone.strip()
    if not cleaned:
        return None

    digits_and_plus = re.sub(r"[\s\-\(\)\.]", "", cleaned)
    if not digits_and_plus:
        raise ValueError("Phone number cannot be empty")

    if PHONE_REGEX.match(digits_and_plus):
        if digits_and_plus.startswith("+91"):
            return digits_and_plus
        if digits_and_plus.startswith("0"):
            return f"+91{digits_and_plus[1:]}"
        return f"+91{digits_and_plus}"

    if INTERNATIONAL_PHONE_REGEX.match(digits_and_plus):
        return digits_and_plus

    raise ValueError("Invalid phone number format. Provide a valid 10-digit Indian mobile number or international number.")


def validate_and_normalize_email(email: str) -> str:
    """
    Strict standards-aware email validation:
    - Rejects empty, whitespace-only, or control character laden emails.
    - Rejects CRLF characters to prevent header injection.
    - Rejects whitespace within the email string.
    - Rejects multiple email addresses (commas, semicolons).
    - Enforces max length: 254 characters (RFC 5321).
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

    if len(trimmed) > 254:
        raise ValueError("Email address cannot exceed 254 characters")

    parts = trimmed.split("@")
    if len(parts) != 2:
        raise ValueError("Email address must contain exactly one '@' symbol")

    local_part, domain_part = parts
    if not local_part or not domain_part:
        raise ValueError("Invalid email format: local and domain parts are required")

    if len(local_part) > 64:
        raise ValueError("Email local part cannot exceed 64 characters")

    if len(domain_part) > 255:
        raise ValueError("Email domain part cannot exceed 255 characters")

    if ".." in local_part or ".." in domain_part:
        raise ValueError("Email must not contain consecutive dots")

    if local_part.startswith(".") or local_part.endswith("."):
        raise ValueError("Local part cannot start or end with a dot")

    if domain_part.startswith(".") or domain_part.endswith("."):
        raise ValueError("Domain part cannot start or end with a dot")

    if "." not in domain_part:
        raise ValueError("Domain part must contain at least one dot")

    labels = domain_part.split(".")
    if any(len(label) == 0 for label in labels):
        raise ValueError("Domain labels cannot be empty")

    if not EMAIL_REGEX.match(trimmed):
        raise ValueError("Invalid email address format")

    return f"{local_part}@{domain_part.lower()}"


def validate_password_strength(password: str) -> str:
    """
    Enforces password complexity for registration and password reset:
    - Min 8 chars, Max 128 chars.
    - At least one uppercase letter, one lowercase letter, one numeric digit.
    - Never trims or silently modifies password.
    """
    if not password:
        raise ValueError("Password is required")

    if len(password) < 8:
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


def validate_address(address: str | None) -> str | None:
    """
    Validates optional address:
    - Max 500 characters.
    - Allows letters, numbers, punctuation, slashes, hashes, spaces, and multiline addresses.
    - Rejects disallowed control characters.
    """
    if address is None:
        return None

    if CONTROL_CHAR_REGEX.search(address):
        raise ValueError("Address contains invalid control characters")

    trimmed = unicodedata.normalize("NFC", str(address)).strip()
    if not trimmed:
        return None

    if len(trimmed) > 500:
        raise ValueError("Address cannot exceed 500 characters")

    return trimmed


def validate_clean_text(
    value: str,
    field_name: str,
    min_length: int = 1,
    max_length: int = 500,
    allow_newlines: bool = False,
) -> str:
    """
    Validates general user-submitted text.
    """
    if value is None:
        raise ValueError(f"{field_name} is required")

    if not allow_newlines and CRLF_REGEX.search(str(value)):
        raise ValueError(f"{field_name} must not contain newline characters")

    if CONTROL_CHAR_REGEX.search(str(value)):
        raise ValueError(f"{field_name} contains invalid control characters")

    normalized = unicodedata.normalize("NFC", str(value)).strip()

    if len(normalized) < min_length:
        raise ValueError(f"{field_name} must be at least {min_length} characters")

    if len(normalized) > max_length:
        raise ValueError(f"{field_name} cannot exceed {max_length} characters")

    return normalized


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


# Canonical list of 28 States and 8 Union Territories of India
INDIAN_STATES = (
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
)


def validate_indian_state(state: str) -> str:
    """
    Validates Indian State or Union Territory name against the canonical list.
    Accepts case-insensitive values and returns the official title-cased name.
    """
    if not state or not isinstance(state, str):
        raise ValueError("State is required")

    cleaned = state.strip()
    if not cleaned:
        raise ValueError("State is required")

    for valid_state in INDIAN_STATES:
        if valid_state.lower() == cleaned.lower():
            return valid_state

    raise ValueError(f"'{cleaned}' is not a valid Indian state or Union Territory")

