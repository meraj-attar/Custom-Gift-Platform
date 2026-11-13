from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.core.validators import (
    normalize_and_validate_indian_phone,
    validate_address,
    validate_and_normalize_email,
    validate_clean_text,
    validate_full_name,
    validate_password_strength,
)


class UserRegister(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: EmailStr = Field(max_length=254)

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
    )

    address: str | None = Field(
        default=None,
        max_length=500,
    )

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        return validate_full_name(value)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)

    @field_validator("phone")
    @classmethod
    def sanitize_phone(cls, value: str | None) -> str | None:
        return normalize_and_validate_indian_phone(value)

    @field_validator("address")
    @classmethod
    def sanitize_address(cls, value: str | None) -> str | None:
        return validate_address(value)

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class UserLogin(BaseModel):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)


class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    role: str
    is_active: bool
    created_at: datetime | None = None

    model_config = {
        "from_attributes": True
    }


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def check_name(cls, value: str) -> str:
        return validate_full_name(value)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if not value:
            return None
        return normalize_and_validate_indian_phone(value)

    @field_validator("address")
    @classmethod
    def check_address(cls, value: str | None) -> str | None:
        if not value:
            return None
        return validate_address(value)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_new_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def verify_password_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password do not match.")
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
    recovery_code: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)


class ForgotPasswordResponse(BaseModel):
    message: str
    cooldown_seconds: int = 60
    expires_in_minutes: int = 5


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)

    @field_validator("otp")
    @classmethod
    def clean_otp(cls, value: str) -> str:
        val = value.strip()
        if not val.isdigit() or len(val) != 6:
            raise ValueError("OTP must be exactly 6 numeric digits")
        return val


class VerifyOTPResponse(BaseModel):
    message: str
    reset_token: str
    expires_in_minutes: int = 15


class ResendOTPRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)


class ResetPasswordWithTokenRequest(BaseModel):
    reset_token: str = Field(min_length=16, max_length=128)
    new_password: str = Field(
        min_length=8,
        max_length=128,
    )
    confirm_password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )

    confirm_password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


# ============================================================
# PRODUCTION-READY RECOVERY SCHEMAS (ZERO THIRD-PARTY APIS)
# ============================================================

class RecoveryVerifyRequest(BaseModel):
    email: EmailStr = Field(max_length=254)
    recovery_code: str = Field(min_length=6, max_length=64)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)

    @field_validator("recovery_code")
    @classmethod
    def clean_recovery_code(cls, value: str) -> str:
        val = value.strip().upper()
        if not val:
            raise ValueError("Recovery code cannot be empty")
        return val


class RecoveryVerifyResponse(BaseModel):
    reset_token: str
    message: str
    expires_in_minutes: int = 10


class RecoveryResetRequest(BaseModel):
    reset_token: str = Field(min_length=16, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class RecoveryRegenerateRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)


class RecoveryRegenerateResponse(BaseModel):
    recovery_code: str
    message: str


class RecoveryStatusResponse(BaseModel):
    has_recovery_code: bool
    is_used: bool
    created_at: datetime | None = None

