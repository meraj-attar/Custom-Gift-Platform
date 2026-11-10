from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.core.validators import (
    validate_and_normalize_email,
    validate_and_normalize_phone,
    validate_clean_text,
    validate_password_strength,
)


class UserRegister(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )

    email: EmailStr

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
        return validate_clean_text(value, "Full name", min_length=2, max_length=100, allow_newlines=False)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)

    @field_validator("phone")
    @classmethod
    def sanitize_phone(cls, value: str | None) -> str | None:
        return validate_and_normalize_phone(value)

    @field_validator("address")
    @classmethod
    def sanitize_address(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return validate_clean_text(value, "Address", min_length=2, max_length=500, allow_newlines=True)

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class UserLogin(BaseModel):
    email: EmailStr
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

    model_config = {
        "from_attributes": True
    }


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_url: str | None = None


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
