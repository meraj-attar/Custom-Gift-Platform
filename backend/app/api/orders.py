from datetime import datetime, timezone
from decimal import Decimal
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models import Order, OrderItem, Product, User
from app.schemas.order import CustomizationUploadResponse, OrderCreate, OrderPublic, OrderStatusUpdate
from app.services.upload_service import resolve_private_local_path, save_customization_image


router = APIRouter(prefix="/orders", tags=["Orders"])
ALLOWED_STATUSES = {"PLACED", "PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "CUSTOMIZING", "SHIPPED", "DELIVERED", "CANCELLED"}


def build_order_number() -> str:
    return f"CG-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"


def load_order(db: Session, order_id: int) -> Order | None:
    return db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))


@router.post("/customization-upload", response_model=CustomizationUploadResponse)
async def upload_customization(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    return CustomizationUploadResponse(url=await save_customization_image(file, current_user.id))


@router.post("", response_model=OrderPublic, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prepared: list[tuple[Product, object]] = []
    total = Decimal("0.00")
    requested_by_product: dict[int, int] = {}

    for item in payload.items:
        product = db.scalar(select(Product).where(Product.id == item.product_id).with_for_update())
        if not product or not product.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")
        requested_quantity = requested_by_product.get(product.id, 0) + item.quantity
        if product.stock < requested_quantity:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Only {product.stock} units of {product.title} are available")
        requested_by_product[product.id] = requested_quantity
        if product.needs_text and not (item.custom_text and item.custom_text.strip()):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Custom text is required for {product.title}")
        if item.custom_text and len(item.custom_text) > product.max_text_length:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Custom text for {product.title} exceeds {product.max_text_length} characters")
        if product.needs_date and not item.event_date:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Event date is required for {product.title}")
        if product.needs_image and not item.custom_image_url:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"A photo is required for {product.title}")
        if item.custom_image_url and item.custom_image_url.startswith("local:"):
            expected_prefix = f"local:customizations/{current_user.id}/"
            if not item.custom_image_url.startswith(expected_prefix):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customization image does not belong to the current user")
        prepared.append((product, item))
        total += product.price * item.quantity

    order = Order(
        order_number=build_order_number(),
        user_id=current_user.id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.lower(),
        address=payload.address.strip(),
        city=payload.city.strip(),
        state=payload.state.strip(),
        pincode=payload.pincode.strip(),
        total_amount=total,
        payment_method=payload.payment_method,
        payment_status="PENDING",
        order_status="CONFIRMED" if payload.payment_method == "cod" else "PAYMENT_PENDING",
    )
    db.add(order)
    db.flush()

    for product, item in prepared:
        product.stock -= item.quantity
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_title=product.title,
                product_image_url=product.image_url,
                unit_price=product.price,
                quantity=item.quantity,
                occasion=item.occasion,
                custom_text=item.custom_text.strip() if item.custom_text else None,
                event_date=item.event_date,
                custom_image_url=item.custom_image_url,
            )
        )

    db.commit()
    return load_order(db, order.id)


@router.get("/me", response_model=list[OrderPublic])
def my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list(db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    ).all())


@router.get("/admin/all", response_model=list[OrderPublic])
def all_orders(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())).all())


@router.get("/{order_id}", response_model=OrderPublic)
def order_detail(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = load_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role != "admin" and order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderPublic)
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    next_status = payload.order_status.upper()
    if next_status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid order status")
    order = load_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    previous_status = order.order_status
    if previous_status == "CANCELLED" and next_status != "CANCELLED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cancelled orders cannot be reopened")
    if order.payment_method == "razorpay" and order.payment_status != "PAID" and next_status not in {"PAYMENT_PENDING", "CANCELLED"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Online-payment orders cannot enter fulfillment before payment is verified")
    if next_status == "CANCELLED" and previous_status != "CANCELLED":
        for item in order.items:
            product = db.get(Product, item.product_id)
            if product:
                product.stock += item.quantity
    if next_status == "DELIVERED" and order.payment_method == "cod" and order.payment_status != "PAID":
        order.payment_status = "PAID"
        order.payment_id = order.payment_id or f"COD-{order.order_number}"
    order.order_status = next_status
    db.commit()
    return load_order(db, order_id)


@router.get("/{order_id}/items/{item_id}/custom-image")
def custom_image(order_id: int, item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = load_order(db, order_id)
    if not order or (current_user.role != "admin" and order.user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    item = next((x for x in order.items if x.id == item_id), None)
    if not item or not item.custom_image_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    path = resolve_private_local_path(item.custom_image_url)
    if not path or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local image not found")
    return FileResponse(path)
