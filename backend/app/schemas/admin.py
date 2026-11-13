from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class AnalyticsResponse(BaseModel):
    revenue: float
    orders_count: int
    orders_by_status: dict[str, int]
    payments_count: int
    payments_by_status: dict[str, int]
    payment_methods: dict[str, int]
    users_count: int
    active_users_count: int
    products_count: int
    active_products_count: int
    low_stock_count: int
    out_of_stock_count: int
    unread_messages: int
    best_sellers: list[dict[str, Any]]
    categories_summary: list[dict[str, Any]]


class AdminPaymentItem(BaseModel):
    id: int
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    method: str
    order_id: int
    order_number: Optional[str] = None
    user_email: Optional[str] = None
    created_at: datetime


class AdminPaymentListResponse(BaseModel):
    items: list[AdminPaymentItem]
    total: int


class AdminInventoryItem(BaseModel):
    id: int
    title: str
    category: str
    price: float
    stock: int
    is_active: bool
    image_url: Optional[str] = None
    is_low_stock: bool
    is_out_of_stock: bool


class AdminInventoryListResponse(BaseModel):
    items: list[AdminInventoryItem]
    total: int
    low_stock_count: int
    out_of_stock_count: int


class AdminInventoryUpdate(BaseModel):
    stock: int = Field(ge=0, description="Updated stock units count")


class AdminCategoryItem(BaseModel):
    name: str
    product_count: int
    active_count: int


class AdminCategoryRename(BaseModel):
    old_name: str = Field(min_length=1, max_length=80)
    new_name: str = Field(min_length=1, max_length=80)


class AdminUserStatusUpdate(BaseModel):
    is_active: bool


class StoreSettingsResponse(BaseModel):
    whatsapp_number: str
    whatsapp_country_code: str
    whatsapp_available: bool
    whatsapp_enquiry_template: str
    store_name: str
    store_email: str
    store_phone: str


class StoreSettingsUpdate(BaseModel):
    whatsapp_number: Optional[str] = None
    whatsapp_country_code: Optional[str] = None
    whatsapp_available: Optional[bool] = None
    whatsapp_enquiry_template: Optional[str] = None
    store_name: Optional[str] = None
    store_email: Optional[str] = None
    store_phone: Optional[str] = None
