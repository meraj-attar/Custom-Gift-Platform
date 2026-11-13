from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validators import (
    validate_and_normalize_email,
    validate_clean_text,
    validate_contact_name,
)


class MessageResponse(BaseModel):
    message: str


class ContactCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr = Field(max_length=254)
    subject: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=10, max_length=2000)
    honeypot: str | None = None

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        return validate_contact_name(value, min_length=2, max_length=80)

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)

    @field_validator("subject")
    @classmethod
    def sanitize_subject(cls, value: str) -> str:
        return validate_clean_text(value, "Subject", min_length=3, max_length=120, allow_newlines=False)

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, value: str) -> str:
        return validate_clean_text(value, "Message", min_length=10, max_length=2000, allow_newlines=True)


class ContactSubmissionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    subject: str
    message: str
    status: str
    created_at: datetime
    is_read: bool


class ContactStatusUpdate(BaseModel):
    status: Literal["New", "In Progress", "Resolved"]


class ContactListResponse(BaseModel):
    items: list[ContactSubmissionPublic]
    total: int
    unread_count: int
