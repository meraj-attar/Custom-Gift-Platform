import base64
import hashlib
import hmac
import os
import secrets

from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt

from jwt import InvalidTokenError

from app.core.config import settings


SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def hash_password(
    password: str,
) -> str:
    salt = os.urandom(16)

    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN,
    )

    return "scrypt${}${}${}${}${}".format(
        SCRYPT_N,
        SCRYPT_R,
        SCRYPT_P,
        base64.urlsafe_b64encode(
            salt
        ).decode("ascii"),
        base64.urlsafe_b64encode(
            derived
        ).decode("ascii"),
    )


def verify_password(
    password: str,
    password_hash: str,
) -> bool:
    try:
        (
            algorithm,
            n,
            r,
            p,
            salt_b64,
            hash_b64,
        ) = password_hash.split("$", 5)

        if algorithm != "scrypt":
            return False

        salt = base64.urlsafe_b64decode(
            salt_b64.encode("ascii")
        )

        expected = base64.urlsafe_b64decode(
            hash_b64.encode("ascii")
        )

        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
        )

        return hmac.compare_digest(
            actual,
            expected,
        )

    except (
        ValueError,
        TypeError,
    ):
        return False


def _create_token(
    subject: str,
    token_type: str,
    expires_minutes: int,
    role: str | None = None,
    extra_claims: dict[str, object] | None = None,
) -> str:
    now = datetime.now(
        timezone.utc
    )

    payload: dict[str, object] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now
        + timedelta(
            minutes=expires_minutes
        ),
    }

    if role:
        payload["role"] = role

    if extra_claims:
        payload.update(
            extra_claims
        )

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_access_token(
    user_id: int,
    role: str,
) -> str:
    return _create_token(
        str(user_id),
        "access",
        settings.access_token_expire_minutes,
        role,
    )


def password_reset_fingerprint(
    password_hash: str,
) -> str:
    return hashlib.sha256(
        password_hash.encode("utf-8")
    ).hexdigest()


def create_password_reset_token(
    user_id: int,
    password_hash: str,
) -> str:
    return _create_token(
        str(user_id),
        "password_reset",
        settings.password_reset_expire_minutes,
        extra_claims={
            "pwd": password_reset_fingerprint(
                password_hash
            ),
        },
    )


def decode_token(
    token: str,
    expected_type: str = "access",
) -> dict:
    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[
            settings.jwt_algorithm
        ],
    )

    if (
        payload.get("type")
        != expected_type
    ):
        raise InvalidTokenError(
            "Invalid token type"
        )

    return payload


RECOVERY_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def generate_recovery_code() -> str:
    """
    Generates a cryptographically secure 16-character recovery code formatted as CG-XXXX-XXXX-XXXX-XXXX.
    Uses unambiguous characters (no 0/O/1/I).
    """
    chars = "".join(secrets.choice(RECOVERY_CHARS) for _ in range(16))
    return f"CG-{chars[0:4]}-{chars[4:8]}-{chars[8:12]}-{chars[12:16]}"


def normalize_recovery_code(code: str) -> str:
    """
    Normalizes recovery code by stripping whitespace, hyphens, and converting to uppercase.
    Automatically prepends 'CG' if omitted by user.
    """
    cleaned = code.strip().upper().replace(" ", "").replace("-", "")
    if not cleaned.startswith("CG") and len(cleaned) == 16:
        cleaned = "CG" + cleaned
    return cleaned


def hash_recovery_code(code: str) -> str:
    """
    Returns SHA-256 hash of normalized recovery code.
    Plaintext recovery codes are never stored in the database.
    """
    normalized = normalize_recovery_code(code)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def generate_reset_token() -> str:
    """
    Generates a single-use cryptographically secure reset token.
    """
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """
    Returns SHA-256 hash of reset token.
    """
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


def generate_otp(length: int = 6) -> str:
    """
    Generates a cryptographically secure numeric OTP (default 6 digits).
    """
    return f"{secrets.randbelow(10**length):0{length}d}"


def hash_otp(otp: str) -> str:
    """
    Returns SHA-256 hash of OTP.
    Plaintext OTPs are never stored in the database.
    """
    return hashlib.sha256(otp.strip().encode("utf-8")).hexdigest()


def verify_otp(otp: str, hashed_otp: str) -> bool:
    """
    Constant-time comparison between entered OTP and stored hash.
    """
    return hmac.compare_digest(hash_otp(otp), hashed_otp)

