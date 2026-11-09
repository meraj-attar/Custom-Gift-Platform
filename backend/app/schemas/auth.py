from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


def validate_password_strength(
    value: str,
) -> str:
    if not any(c.isupper() for c in value):
        raise ValueError(
            "Password must include an uppercase letter"
        )

    if not any(c.islower() for c in value):
        raise ValueError(
            "Password must include a lowercase letter"
        )

    if not any(c.isdigit() for c in value):
        raise ValueError(
            "Password must include a number"
        )

    return value


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

    @field_validator("password")
    @classmethod
    def password_strength(
        cls,
        value: str,
    ) -> str:
        return validate_password_strength(value)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


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


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_url: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(
        min_length=1
    )

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
    def password_strength(
        cls,
        value: str,
    ) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def passwords_match(self):
        if (
            self.new_password
            != self.confirm_password
        ):
            raise ValueError(
                "Passwords do not match"
            )

        return self