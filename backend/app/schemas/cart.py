from pydantic import BaseModel, Field
from app.schemas.product import ProductPublic


class CartItemPayload(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=10)
    customization: dict | None = Field(default_factory=dict)


class CartItemResponse(BaseModel):
    cart_id: str
    product: ProductPublic
    quantity: int
    customization: dict | None = None


class CartResponse(BaseModel):
    user_id: int
    items: list[CartItemResponse] = []
    total_count: int = 0
