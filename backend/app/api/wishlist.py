from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Product, User, WishlistItem
from app.schemas.product import ProductPublic


router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=list[ProductPublic])
def get_wishlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.scalars(
        select(Product)
        .join(WishlistItem, WishlistItem.product_id == Product.id)
        .where(
            WishlistItem.user_id == current_user.id,
            Product.is_active.is_(True),
        )
        .order_by(WishlistItem.created_at.desc())
    ).all()
    return list(products)


@router.post("/{product_id}", response_model=ProductPublic, status_code=status.HTTP_200_OK)
def add_to_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    existing = db.scalar(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product.id,
        )
    )
    if not existing:
        db.add(WishlistItem(user_id=current_user.id, product_id=product.id))
        db.commit()

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.scalar(
        select(WishlistItem).where(
            WishlistItem.user_id == current_user.id,
            WishlistItem.product_id == product_id,
        )
    )
    if item:
        db.delete(item)
        db.commit()
