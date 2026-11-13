from decimal import Decimal
from math import ceil

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models import Product, User
from app.schemas.product import ProductCreate, ProductList, ProductPublic, ProductUpdate
from app.services.slug_service import unique_product_slug
from app.services.upload_service import save_product_image

router = APIRouter(prefix="/products", tags=["Products"])

ALLOWED_SORTS = {
    "featured": (Product.is_featured.desc(), Product.created_at.desc()),
    "newest": (Product.created_at.desc(),),
    "price_asc": (Product.price.asc(),),
    "price_desc": (Product.price.desc(),),
    "rating": (Product.rating.desc(), Product.created_at.desc()),
}

# Authoritative canonical category mapping and alias resolution
CATEGORY_CANONICAL_MAP: dict[str, str] = {
    "mugs": "Mugs",
    "mug": "Mugs",
    "customize mugs": "Mugs",
    "customized mugs": "Mugs",
    "photo mugs": "Mugs",
    "frames": "Frames",
    "frame": "Frames",
    "photo frames": "Frames",
    "photo frame": "Frames",
    "memory frames": "Frames",
    "hampers": "Hampers",
    "hamper": "Hampers",
    "gift hampers": "Hampers",
    "gift hamper": "Hampers",
    "celebration hampers": "Hampers",
    "decor": "Decor",
    "home decor": "Decor",
    "personalized lamps": "Decor",
    "lamps": "Decor",
    "lamp": "Decor",
    "cushions": "Decor",
    "cushion": "Decor",
    "keepsakes": "Keepsakes",
    "keepsake": "Keepsakes",
    "photo gifts": "Photo Gifts",
    "photo gift": "Photo Gifts",
    "personalized photo gifts": "Photo Gifts",
    "personalized accessories": "Personalized Accessories",
    "accessories": "Personalized Accessories",
    "accessory": "Personalized Accessories",
    "keychains": "Personalized Accessories",
    "personalized gifts": "Personalized Accessories",
}


@router.get("", response_model=ProductList)
def list_products(
    search: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=80),
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    in_stock: bool | None = Query(default=None),
    customizable: bool | None = Query(default=None),
    discounted: bool | None = Query(default=None),
    featured: bool | None = Query(default=None),
    sort_by: str = Query(default="featured", pattern="^(featured|newest|price_asc|price_desc|rating)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum price cannot be greater than maximum price",
        )

    conditions = [Product.is_active.is_(True)]

    if search and search.strip():
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Product.title.ilike(term),
                Product.description.ilike(term),
                Product.category.ilike(term),
            )
        )

    if category and category.strip().lower() != "all":
        raw_cat = category.strip().lower()
        canonical = CATEGORY_CANONICAL_MAP.get(raw_cat)
        if canonical:
            aliases = [k for k, v in CATEGORY_CANONICAL_MAP.items() if v == canonical]
            aliases.append(canonical.lower())
            conditions.append(func.trim(func.lower(Product.category)).in_(aliases))
        else:
            conditions.append(func.trim(func.lower(Product.category)) == raw_cat)

    if min_price is not None:
        conditions.append(Product.price >= min_price)

    if max_price is not None:
        conditions.append(Product.price <= max_price)

    if in_stock is True:
        conditions.append(Product.stock > 0)
    elif in_stock is False:
        conditions.append(Product.stock == 0)

    if customizable is True:
        conditions.append(Product.customizable.is_(True))
    elif customizable is False:
        conditions.append(Product.customizable.is_(False))

    if discounted is True:
        conditions.append(Product.discount_percent > 0)
    elif discounted is False:
        conditions.append(Product.discount_percent == 0)

    if featured is not None:
        conditions.append(Product.is_featured.is_(featured))

    # Safe sorting from allowlist
    sort_order = ALLOWED_SORTS.get(sort_by, ALLOWED_SORTS["featured"])

    total = db.scalar(select(func.count(Product.id)).where(*conditions)) or 0
    products = db.scalars(
        select(Product)
        .where(*conditions)
        .order_by(*sort_order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return ProductList(
        items=list(products),
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, ceil(total / page_size)),
    )


@router.get("/categories", response_model=list[str])
def categories(db: Session = Depends(get_db)):
    raw_categories = db.scalars(
        select(func.trim(Product.category))
        .where(Product.is_active.is_(True))
        .distinct()
    ).all()

    seen: dict[str, str] = {}
    for raw in raw_categories:
        if not raw or not raw.strip():
            continue
        cleaned = raw.strip()
        canonical = CATEGORY_CANONICAL_MAP.get(cleaned.lower(), cleaned)
        key = canonical.lower()
        if key not in seen:
            seen[key] = canonical

    # Return distinct sorted categories
    return sorted(seen.values(), key=lambda x: x.lower())


@router.get("/{identifier}", response_model=ProductPublic)
def get_product(identifier: str, db: Session = Depends(get_db)):
    query = select(Product).where(Product.is_active.is_(True))
    if identifier.isdigit():
        query = query.where(Product.id == int(identifier))
    else:
        query = query.where(Product.slug == identifier)
    product = db.scalar(query)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductPublic, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = Product(**payload.model_dump(), slug=unique_product_slug(db, payload.title))
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductPublic)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates:
        product.slug = unique_product_slug(db, updates["title"], exclude_id=product.id)
    for key, value in updates.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product.is_active = False
    db.commit()


@router.post("/admin/upload-image")
async def upload_product_image(file: UploadFile = File(...), _: User = Depends(require_admin)):
    return {"url": await save_product_image(file)}
