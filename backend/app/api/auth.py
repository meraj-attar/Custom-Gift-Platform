import logging

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_token,
    hash_password,
    password_reset_fingerprint,
    verify_password,
)
from app.dependencies.auth import get_current_user
from app.models import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserPublic,
    UserRegister,
)
from app.schemas.common import MessageResponse
from app.services.email_service import (
    send_password_reset_email,
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
                "An account with this email "
                "already exists"
            ),
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(
            payload.password
        ),
        phone=payload.phone,
        address=payload.address,
        role="customer",
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
        or not user.is_active
        or not verify_password(
            payload.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
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


# ============================================================
# FORGOT PASSWORD
# ============================================================

@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.lower().strip()

    # --------------------------------------------------------
    # Find user by entered email
    # --------------------------------------------------------

    user = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    # --------------------------------------------------------
    # Email does not exist in database
    # --------------------------------------------------------

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This email is not registered",
        )

    # --------------------------------------------------------
    # Account exists but is inactive
    # --------------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account is inactive",
        )

    # --------------------------------------------------------
    # Generate secure password-reset token
    # --------------------------------------------------------

    token = create_password_reset_token(
        user.id,
        user.password_hash,
    )

    reset_url = (
        f"{settings.frontend_url.rstrip('/')}"
        f"/reset-password?token={token}"
    )

    # --------------------------------------------------------
    # Send reset link to THIS REGISTERED USER'S email
    # --------------------------------------------------------

    try:
        email_sent = (
            send_password_reset_email(
                user.email,
                reset_url,
            )
        )

        if not email_sent:
            raise HTTPException(
                status_code=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
                detail=(
                    "Unable to send reset email. "
                    "Please try again later."
                ),
            )

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Unable to send password reset email "
            "to %s",
            user.email,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to send reset email. "
                "Please try again later."
            ),
        )

    # --------------------------------------------------------
    # Development-only reset URL
    # --------------------------------------------------------

    development_reset_url = None

    if (
        settings.app_env.lower()
        == "development"
    ):
        development_reset_url = reset_url

    return ForgotPasswordResponse(
        message=(
            "Password reset instructions "
            "have been sent to your email."
        ),
        reset_url=development_reset_url,
    )


# ============================================================
# RESET PASSWORD
# ============================================================

@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Decode and validate reset token
    # --------------------------------------------------------

    try:
        token_data = decode_token(
            payload.token,
            "password_reset",
        )

        user_id = int(
            token_data["sub"]
        )

        token_password_fingerprint = (
            token_data["pwd"]
        )

    except (
        InvalidTokenError,
        KeyError,
        TypeError,
        ValueError,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    # --------------------------------------------------------
    # Find account
    # --------------------------------------------------------

    user = db.get(
        User,
        user_id,
    )

    if (
        not user
        or not user.is_active
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    # --------------------------------------------------------
    # Check whether reset link is still valid
    #
    # The token contains a fingerprint of the old
    # password hash.
    #
    # Once password changes, the old reset token becomes
    # unusable.
    # --------------------------------------------------------

    current_fingerprint = (
        password_reset_fingerprint(
            user.password_hash
        )
    )

    if (
        token_password_fingerprint
        != current_fingerprint
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This reset link has already been used "
                "or is no longer valid"
            ),
        )

    # --------------------------------------------------------
    # Prevent resetting to same password
    # --------------------------------------------------------

    if verify_password(
        payload.new_password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must be different "
                "from the current password"
            ),
        )

    # --------------------------------------------------------
    # Store new secure password hash
    # --------------------------------------------------------

    user.password_hash = hash_password(
        payload.new_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return MessageResponse(
        message="Password updated successfully"
    )