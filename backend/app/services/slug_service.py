import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "product"


def unique_product_slug(db: Session, title: str, exclude_id: int | None = None) -> str:
    base = slugify(title)
    candidate = base
    counter = 2
    while True:
        query = select(Product).where(Product.slug == candidate)
        if exclude_id:
            query = query.where(Product.id != exclude_id)
        if not db.scalar(query):
            return candidate
        candidate = f"{base}-{counter}"
        counter += 1
