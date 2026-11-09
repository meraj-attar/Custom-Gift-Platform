from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=10)
    occasion: str | None = Field(default=None, max_length=80)
    custom_text: str | None = Field(default=None, max_length=1000)
    event_date: date | None = None
    custom_image_url: str | None = Field(default=None, max_length=500)


class OrderCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=30)
    email: EmailStr
    address: str = Field(min_length=5, max_length=800)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    pincode: str = Field(min_length=4, max_length=20)
    payment_method: str = Field(pattern="^(cod|razorpay)$")
    items: list[OrderItemCreate] = Field(min_length=1, max_length=20)


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
    city: str
    state: str
    pincode: str
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
