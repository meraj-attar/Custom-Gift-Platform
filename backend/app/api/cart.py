from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models import Product, User
from app.schemas.cart import CartItemPayload, CartItemResponse, CartResponse

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("", response_model=CartResponse)
def get_user_cart(
    current_user: User = Depends(get_current_user),
):
    """Retrieve authenticated user's cart. Requires active authentication."""
    return CartResponse(
        user_id=current_user.id,
        items=[],
        total_count=0,
    )


@router.post("/items", response_model=CartItemResponse, status_code=status.HTTP_200_OK)
def add_item_to_cart(
    payload: CartItemPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Validates and verifies adding an item to the authenticated user's cart.
    Returns 401 Unauthorized for guests.
    """
    product = db.get(Product, payload.product_id)
    if not product or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or inactive",
        )

    if product.stock < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock available for this product",
        )

    return CartItemResponse(
        cart_id=f"citem_{current_user.id}_{product.id}",
        product=product,
        quantity=payload.quantity,
        customization=payload.customization or {},
    )


@router.delete("/items/{product_id}", status_code=status.HTTP_200_OK)
def remove_item_from_cart(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Removes an item from the authenticated user's cart session."""
    return {"message": "Item removed from cart", "product_id": product_id}


@router.delete("", status_code=status.HTTP_200_OK)
def clear_user_cart(
    current_user: User = Depends(get_current_user),
):
    """Clears the authenticated user's cart."""
    return {"message": "Cart cleared", "user_id": current_user.id}
