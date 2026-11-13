from datetime import datetime, timezone
from decimal import Decimal
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models import Address, Order, OrderItem, Product, User
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


@router.get("/customization-preview")
def preview_customization_image(ref: str, current_user: User = Depends(get_current_user)):
    expected_prefix = f"local:customizations/{current_user.id}/"
    if not ref.startswith(expected_prefix):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customization image does not belong to the current user")
    path = resolve_private_local_path(ref)
    if not path or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return FileResponse(path)


@router.post("", response_model=OrderPublic, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. If saved_address_id is provided, verify it belongs to current_user
    if payload.saved_address_id:
        saved_addr = db.scalar(
            select(Address).where(Address.id == payload.saved_address_id, Address.user_id == current_user.id)
        )
        if not saved_addr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected saved address not found or does not belong to you",
            )

    prepared: list[tuple[Product, object]] = []
    subtotal = Decimal("0.00")
    requested_by_product: dict[int, int] = {}

    for item in payload.items:
        product = db.scalar(select(Product).where(Product.id == item.product_id).with_for_update())
        if not product or not product.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")
        requested_quantity = requested_by_product.get(product.id, 0) + item.quantity
        if product.stock < requested_quantity:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Only {product.stock} units of {product.title} are available")
        requested_by_product[product.id] = requested_quantity
        # Note: Online Studio customization has been replaced with WhatsApp contact.
        # Customization is optional at checkout and no longer required for any product.
        if item.custom_text and len(item.custom_text) > product.max_text_length:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Custom text for {product.title} exceeds {product.max_text_length} characters")
        if item.custom_image_url and item.custom_image_url.startswith("local:"):
            expected_prefix = f"local:customizations/{current_user.id}/"
            if not item.custom_image_url.startswith(expected_prefix):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customization image does not belong to the current user")
        prepared.append((product, item))
        subtotal += product.price * item.quantity

    # 2. Shipping calculation
    delivery_option = payload.delivery_option or "standard"
    if delivery_option == "express":
        shipping_fee = Decimal("99.00")
        estimated_delivery = "2–3 Business Days"
    else:
        delivery_option = "standard"
        shipping_fee = Decimal("0.00")
        estimated_delivery = "4–6 Business Days"

    total = subtotal + shipping_fee

    # 3. Save address to profile if requested and not already a saved address
    if payload.save_address_to_profile and not payload.saved_address_id:
        has_existing = db.scalar(select(Address).where(Address.user_id == current_user.id))
        new_addr = Address(
            user_id=current_user.id,
            full_name=payload.name.strip(),
            phone=payload.phone.strip(),
            email=payload.email.lower() if payload.email else None,
            address_line1=payload.address.strip(),
            address_line2=payload.address_line2.strip() if payload.address_line2 else None,
            landmark=payload.landmark.strip() if payload.landmark else None,
            city=payload.city.strip(),
            state=payload.state.strip(),
            pincode=payload.pincode.strip(),
            is_default=has_existing is None,
        )
        db.add(new_addr)

    order = Order(
        order_number=build_order_number(),
        user_id=current_user.id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.lower(),
        address=payload.address.strip(),
        address_line2=payload.address_line2.strip() if payload.address_line2 else None,
        landmark=payload.landmark.strip() if payload.landmark else None,
        city=payload.city.strip(),
        state=payload.state.strip(),
        pincode=payload.pincode.strip(),
        delivery_option=delivery_option,
        shipping_fee=shipping_fee,
        subtotal=subtotal,
        estimated_delivery=estimated_delivery,
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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid order status")
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
