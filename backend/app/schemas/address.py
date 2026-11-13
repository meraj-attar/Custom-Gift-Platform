from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    normalize_and_validate_indian_phone,
    validate_and_normalize_email,
    validate_clean_text,
    validate_full_name,
    validate_indian_state,
    validate_pincode,
)


class AddressCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=10, max_length=20)
    email: EmailStr | None = None
    address_line1: str = Field(min_length=5, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    landmark: str | None = Field(default=None, max_length=150)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=6, max_length=10)
    is_default: bool = False

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, value: str) -> str:
        return validate_full_name(value)

    @field_validator("phone")
    @classmethod
    def sanitize_phone(cls, value: str) -> str:
        res = normalize_and_validate_indian_phone(value)
        if not res:
            raise ValueError("Mobile number is required")
        return res

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return validate_and_normalize_email(str(value))

    @field_validator("address_line1")
    @classmethod
    def sanitize_address_line1(cls, value: str) -> str:
        return validate_clean_text(value, "Address line 1", min_length=5, max_length=255, allow_newlines=False)

    @field_validator("address_line2")
    @classmethod
    def sanitize_address_line2(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return validate_clean_text(value, "Address line 2", min_length=1, max_length=255, allow_newlines=False)

    @field_validator("landmark")
    @classmethod
    def sanitize_landmark(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return validate_clean_text(value, "Landmark", min_length=1, max_length=150, allow_newlines=False)

    @field_validator("city")
    @classmethod
    def sanitize_city(cls, value: str) -> str:
        return validate_clean_text(value, "City", min_length=2, max_length=100, allow_newlines=False)

    @field_validator("state")
    @classmethod
    def sanitize_state(cls, value: str) -> str:
        return validate_indian_state(value)

    @field_validator("pincode")
    @classmethod
    def sanitize_pincode(cls, value: str) -> str:
        return validate_pincode(value)


class AddressUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    email: EmailStr | None = None
    address_line1: str | None = Field(default=None, min_length=5, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    landmark: str | None = Field(default=None, max_length=150)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    state: str | None = Field(default=None, min_length=2, max_length=100)
    pincode: str | None = Field(default=None, min_length=6, max_length=10)
    is_default: bool | None = None

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_full_name(value)

    @field_validator("phone")
    @classmethod
    def sanitize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_and_validate_indian_phone(value)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return validate_and_normalize_email(str(value))

    @field_validator("address_line1")
    @classmethod
    def sanitize_address_line1(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_clean_text(value, "Address line 1", min_length=5, max_length=255, allow_newlines=False)

    @field_validator("address_line2")
    @classmethod
    def sanitize_address_line2(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return validate_clean_text(value, "Address line 2", min_length=1, max_length=255, allow_newlines=False)

    @field_validator("landmark")
    @classmethod
    def sanitize_landmark(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return validate_clean_text(value, "Landmark", min_length=1, max_length=150, allow_newlines=False)

    @field_validator("city")
    @classmethod
    def sanitize_city(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_clean_text(value, "City", min_length=2, max_length=100, allow_newlines=False)

    @field_validator("state")
    @classmethod
    def sanitize_state(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_indian_state(value)

    @field_validator("pincode")
    @classmethod
    def sanitize_pincode(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_pincode(value)


class AddressPublic(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: str
    email: str | None = None
    address_line1: str
    address_line2: str | None = None
    landmark: str | None = None
    city: str
    state: str
    pincode: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
