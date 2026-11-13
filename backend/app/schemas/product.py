from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class ProductBase(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    category: str = Field(min_length=2, max_length=80)
    price: Decimal = Field(gt=0)
    description: str = Field(min_length=10, max_length=3000)
    rating: float = Field(default=4.5, ge=0, le=5)
    discount_percent: int = Field(default=0, ge=0, le=90)
    stock: int = Field(default=0, ge=0)
    customizable: bool = False
    delivery_time: str | None = Field(default="3-5 business days", max_length=80)
    material: str | None = Field(default=None, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    needs_image: bool = False
    needs_text: bool = False
    needs_date: bool = False
    max_text_length: int = Field(default=120, ge=1, le=1000)
    is_featured: bool = False

    @field_validator("category")
    @classmethod
    def clean_category(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Category must have at least 2 non-whitespace characters")
        return cleaned


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    price: Decimal | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, min_length=10, max_length=3000)
    rating: float | None = Field(default=None, ge=0, le=5)
    discount_percent: int | None = Field(default=None, ge=0, le=90)
    stock: int | None = Field(default=None, ge=0)
    customizable: bool | None = None
    delivery_time: str | None = Field(default=None, max_length=80)
    material: str | None = Field(default=None, max_length=120)
    image_url: str | None = Field(default=None, max_length=500)
    needs_image: bool | None = None
    needs_text: bool | None = None
    needs_date: bool | None = None
    max_text_length: int | None = Field(default=None, ge=1, le=1000)
    is_featured: bool | None = None
    is_active: bool | None = None

    @field_validator("category")
    @classmethod
    def clean_update_category(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Category must have at least 2 non-whitespace characters")
        return cleaned


class ProductPublic(ProductBase):
    id: int
    slug: str
    is_active: bool

    model_config = {"from_attributes": True}


class ProductList(BaseModel):
    items: list[ProductPublic]
    total: int
    page: int
    page_size: int
    pages: int
