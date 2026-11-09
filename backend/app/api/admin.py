from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models import ContactMessage, Order, Product, User
from app.schemas.auth import UserPublic


router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    revenue = db.scalar(select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.payment_status == "PAID")) or Decimal("0")
    return {
        "users": db.scalar(select(func.count(User.id)).where(User.role == "customer")) or 0,
        "products": db.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True))) or 0,
        "orders": db.scalar(select(func.count(Order.id))) or 0,
        "pending_orders": db.scalar(select(func.count(Order.id)).where(Order.order_status.in_(["PLACED", "PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "CUSTOMIZING"]))) or 0,
        "revenue": float(revenue),
        "messages": db.scalar(select(func.count(ContactMessage.id)).where(ContactMessage.is_read.is_(False))) or 0,
    }


@router.get("/users", response_model=list[UserPublic])
def users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(User).order_by(User.created_at.desc())).all())
