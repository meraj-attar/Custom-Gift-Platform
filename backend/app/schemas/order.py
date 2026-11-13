from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.validators import (
    validate_and_normalize_email,
    validate_and_normalize_phone,
    validate_clean_text,
    validate_pincode,
)


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=10)
    occasion: str | None = Field(default=None, max_length=80)
    custom_text: str | None = Field(default=None, max_length=1000)
    event_date: date | None = None
    custom_image_url: str | None = Field(default=None, max_length=500)

    @field_validator("occasion")
    @classmethod
    def sanitize_occasion(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return validate_clean_text(value, "Occasion", min_length=1, max_length=80, allow_newlines=False)

    @field_validator("custom_text")
    @classmethod
    def sanitize_custom_text(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return validate_clean_text(value, "Custom message", min_length=1, max_length=1000, allow_newlines=True)


class OrderCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=30)
    email: EmailStr
    address: str = Field(min_length=5, max_length=800)
    address_line2: str | None = Field(default=None, max_length=255)
    landmark: str | None = Field(default=None, max_length=150)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=4, max_length=20)
    delivery_option: str = Field(default="standard", pattern="^(standard|express)$")
    saved_address_id: int | None = None
    save_address_to_profile: bool = False
    payment_method: str = Field(pattern="^(cod|razorpay)$")
    items: list[OrderItemCreate] = Field(min_length=1, max_length=20)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        return validate_clean_text(value, "Customer name", min_length=2, max_length=150, allow_newlines=False)

    @field_validator("phone")
    @classmethod
    def sanitize_phone(cls, value: str) -> str:
        res = validate_and_normalize_phone(value)
        if not res:
            raise ValueError("Phone number is required")
        return res

    @field_validator("email")
    @classmethod
    def sanitize_email(cls, value: str) -> str:
        return validate_and_normalize_email(value)

    @field_validator("address")
    @classmethod
    def sanitize_address(cls, value: str) -> str:
        return validate_clean_text(value, "Address", min_length=5, max_length=800, allow_newlines=True)

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
        return validate_clean_text(value, "State", min_length=2, max_length=100, allow_newlines=False)

    @field_validator("pincode")
    @classmethod
    def sanitize_pincode(cls, value: str) -> str:
        return validate_pincode(value)


class OrderItemPublic(BaseModel):
    id: int
    product_id: int
    product_title: str
    product_image_url: str | None
    unit_price: Decimal
    quantity: int
    occasion: str | None
    custom_text: str | None
    event_date: date | None
    custom_image_url: str | None

    model_config = {"from_attributes": True}


class OrderPublic(BaseModel):
    id: int
    order_number: str
    user_id: int
    name: str
    phone: str
    email: EmailStr
    address: str
    address_line2: str | None = None
    landmark: str | None = None
    city: str
    state: str
    pincode: str
    delivery_option: str = "standard"
    shipping_fee: Decimal = Decimal("0.00")
    subtotal: Decimal | None = None
    estimated_delivery: str | None = None
    total_amount: Decimal
    payment_method: str
    payment_status: str
    payment_id: str | None
    order_status: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemPublic]

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    order_status: str


class CustomizationUploadResponse(BaseModel):
    url: str
