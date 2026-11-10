from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import validate_and_normalize_email, validate_clean_text


class MessageResponse(BaseModel):
    message: str


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=180)
    message: str = Field(min_length=10, max_length=4000)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        return validate_clean_text(value, "Name", min_length=2, max_length=120, allow_newlines=False)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)

    @field_validator("subject")
    @classmethod
    def sanitize_subject(cls, value: str) -> str:
        return validate_clean_text(value, "Subject", min_length=3, max_length=180, allow_newlines=False)

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, value: str) -> str:
        return validate_clean_text(value, "Message", min_length=10, max_length=4000, allow_newlines=True)
