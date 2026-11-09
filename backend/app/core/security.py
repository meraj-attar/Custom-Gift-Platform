import base64
import hashlib
import hmac
import os

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