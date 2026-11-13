from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import generate_recovery_code, hash_recovery_code
from app.dependencies.auth import require_admin
from app.models import ContactMessage, Order, OrderItem, Payment, Product, StoreSetting, User
from app.schemas.admin import (
    AdminCategoryItem,
    AdminCategoryRename,
    AdminInventoryItem,
    AdminInventoryListResponse,
    AdminInventoryUpdate,
    AdminPaymentItem,
    AdminPaymentListResponse,
    AdminUserStatusUpdate,
    AnalyticsResponse,
    StoreSettingsResponse,
    StoreSettingsUpdate,
)
from app.schemas.auth import RecoveryRegenerateResponse, UserPublic
from app.schemas.common import (
    ContactListResponse,
    ContactStatusUpdate,
    ContactSubmissionPublic,
    MessageResponse,
)
from app.services.settings_service import get_all_settings, update_bulk_settings

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    revenue = (
        db.scalar(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(
                Order.payment_status == "PAID"
            )
        )
        or Decimal("0")
    )
    return {
        "users": db.scalar(select(func.count(User.id)).where(User.role == "customer")) or 0,
        "products": db.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True))) or 0,
        "orders": db.scalar(select(func.count(Order.id))) or 0,
        "pending_orders": (
            db.scalar(
                select(func.count(Order.id)).where(
                    Order.order_status.in_(
                        ["PLACED", "PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "CUSTOMIZING"]
                    )
                )
            )
            or 0
        ),
        "revenue": float(revenue),
        "messages": db.scalar(select(func.count(ContactMessage.id)).where(ContactMessage.is_read.is_(False))) or 0,
    }


@router.get("/analytics", response_model=AnalyticsResponse)
def analytics(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """
    Comprehensive analytics and breakdown for the admin dashboard.
    """
    # 1. Revenue
    revenue = (
        db.scalar(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(
                Order.payment_status == "PAID"
            )
        )
        or Decimal("0")
    )

    # 2. Orders & Order status breakdown
    orders_count = db.scalar(select(func.count(Order.id))) or 0
    orders_by_status_raw = db.execute(
        select(Order.order_status, func.count(Order.id)).group_by(Order.order_status)
    ).all()
    orders_by_status = {status: count for status, count in orders_by_status_raw}

    # 3. Payment methods breakdown
    pm_raw = db.execute(
        select(Order.payment_method, func.count(Order.id)).group_by(Order.payment_method)
    ).all()
    payment_methods = {pm or "unknown": count for pm, count in pm_raw}

    # 4. Payments table metrics
    payments_count = db.scalar(select(func.count(Payment.id))) or 0
    payments_by_status_raw = db.execute(
        select(Payment.status, func.count(Payment.id)).group_by(Payment.status)
    ).all()
    payments_by_status = {st: count for st, count in payments_by_status_raw}

    # 5. Customer metrics
    users_count = db.scalar(select(func.count(User.id)).where(User.role == "customer")) or 0
    active_users_count = (
        db.scalar(
            select(func.count(User.id)).where(
                User.role == "customer", User.is_active.is_(True)
            )
        )
        or 0
    )

    # 6. Product & Inventory counts
    products_count = db.scalar(select(func.count(Product.id))) or 0
    active_products_count = (
        db.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True))) or 0
    )
    low_stock_count = (
        db.scalar(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True),
                Product.stock > 0,
                Product.stock < 5,
            )
        )
        or 0
    )
    out_of_stock_count = (
        db.scalar(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True),
                Product.stock == 0,
            )
        )
        or 0
    )

    # 7. Unread messages
    unread_messages = (
        db.scalar(
            select(func.count(ContactMessage.id)).where(ContactMessage.is_read.is_(False))
        )
        or 0
    )

    # 8. Best sellers
    best_sellers_query = (
        select(
            Product.id,
            Product.title,
            Product.image_url,
            func.coalesce(func.sum(OrderItem.quantity), 0).label("units_sold"),
            func.coalesce(func.sum(OrderItem.unit_price * OrderItem.quantity), 0).label("revenue"),
        )
        .join(OrderItem, OrderItem.product_id == Product.id)
        .group_by(Product.id, Product.title, Product.image_url)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
    )
    best_sellers_rows = db.execute(best_sellers_query).all()
    best_sellers = [
        {
            "id": row.id,
            "title": row.title,
            "image_url": row.image_url,
            "units_sold": int(row.units_sold),
            "revenue": float(row.revenue),
        }
        for row in best_sellers_rows
    ]

    # 9. Categories summary
    cats_query = (
        select(Product.category, func.count(Product.id))
        .where(Product.is_active.is_(True))
        .group_by(Product.category)
    )
    cats_rows = db.execute(cats_query).all()
    categories_summary = [
        {"name": row[0], "count": row[1]} for row in cats_rows if row[0]
    ]

    return AnalyticsResponse(
        revenue=float(revenue),
        orders_count=orders_count,
        orders_by_status=orders_by_status,
        payments_count=payments_count,
        payments_by_status=payments_by_status,
        payment_methods=payment_methods,
        users_count=users_count,
        active_users_count=active_users_count,
        products_count=products_count,
        active_products_count=active_products_count,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        unread_messages=unread_messages,
        best_sellers=best_sellers,
        categories_summary=categories_summary,
    )


# =========================================================================
# PAYMENT MANAGEMENT MODULE (ADMIN ONLY)
# =========================================================================


@router.get("/payments", response_model=AdminPaymentListResponse)
def get_payments(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Paginated list of payment transactions with status filtering and search.
    """
    stmt = (
        select(Payment)
        .options(joinedload(Payment.order), joinedload(Payment.user))
        .join(Order, Payment.order_id == Order.id, isouter=True)
        .join(User, Payment.user_id == User.id, isouter=True)
    )

    if status_filter and status_filter.strip() and status_filter.lower() != "all":
        stmt = stmt.where(func.upper(Payment.status) == status_filter.strip().upper())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Payment.razorpay_order_id).like(term),
                func.lower(Payment.razorpay_payment_id).like(term),
                func.lower(Order.order_number).like(term),
                func.lower(User.email).like(term),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    stmt = stmt.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
    payments = db.scalars(stmt).all()

    items = [
        AdminPaymentItem(
            id=p.id,
            razorpay_order_id=p.razorpay_order_id,
            razorpay_payment_id=p.razorpay_payment_id,
            amount=float(p.amount),
            currency=p.currency,
            status=p.status,
            method=p.payment_method or "razorpay",
            order_id=p.order_id,
            order_number=p.order.order_number if p.order else None,
            user_email=p.user.email if p.user else None,
            created_at=p.created_at,
        )
        for p in payments
    ]

    return AdminPaymentListResponse(items=items, total=total)


# =========================================================================
# INVENTORY MANAGEMENT MODULE (ADMIN ONLY)
# =========================================================================


@router.get("/inventory", response_model=AdminInventoryListResponse)
def get_inventory(
    filter_type: Optional[str] = Query(None, alias="filter"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Inventory status listing with filter for low stock (<5) and out of stock (0).
    """
    stmt = select(Product)

    if filter_type == "low_stock":
        stmt = stmt.where(Product.stock > 0, Product.stock < 5)
    elif filter_type == "out_of_stock":
        stmt = stmt.where(Product.stock == 0)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.title).like(term),
                func.lower(Product.category).like(term),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    low_stock_count = (
        db.scalar(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True),
                Product.stock > 0,
                Product.stock < 5,
            )
        )
        or 0
    )
    out_of_stock_count = (
        db.scalar(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True),
                Product.stock == 0,
            )
        )
        or 0
    )

    stmt = stmt.order_by(Product.stock.asc(), Product.title.asc()).offset(skip).limit(limit)
    products = db.scalars(stmt).all()

    items = [
        AdminInventoryItem(
            id=p.id,
            title=p.title,
            category=p.category,
            price=float(p.price),
            stock=p.stock,
            is_active=p.is_active,
            image_url=p.image_url,
            is_low_stock=(p.stock > 0 and p.stock < 5),
            is_out_of_stock=(p.stock == 0),
        )
        for p in products
    ]

    return AdminInventoryListResponse(
        items=items,
        total=total,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
    )


@router.patch("/inventory/{product_id}", response_model=AdminInventoryItem)
def update_product_stock(
    product_id: int,
    payload: AdminInventoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Direct inventory stock update for a product.
    """
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    product.stock = payload.stock
    db.commit()
    db.refresh(product)

    return AdminInventoryItem(
        id=product.id,
        title=product.title,
        category=product.category,
        price=float(product.price),
        stock=product.stock,
        is_active=product.is_active,
        image_url=product.image_url,
        is_low_stock=(product.stock > 0 and product.stock < 5),
        is_out_of_stock=(product.stock == 0),
    )


# =========================================================================
# CATEGORY MANAGEMENT MODULE (ADMIN ONLY)
# =========================================================================


@router.get("/categories", response_model=list[AdminCategoryItem])
def get_categories(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    List all categories with total product counts and active counts.
    """
    rows = db.execute(
        select(
            Product.category,
            func.count(Product.id).label("total_count"),
            func.count(Product.id).filter(Product.is_active.is_(True)).label("active_count"),
        )
        .group_by(Product.category)
        .order_by(Product.category.asc())
    ).all()

    return [
        AdminCategoryItem(
            name=row[0].strip(),
            product_count=row[1],
            active_count=row[2],
        )
        for row in rows
        if row[0] and row[0].strip()
    ]


@router.patch("/categories/rename")
def rename_category(
    payload: AdminCategoryRename,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Rename a product category across all products in the catalog.
    """
    old_cat = payload.old_name.strip()
    new_cat = payload.new_name.strip()

    if not old_cat or not new_cat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category names cannot be empty",
        )

    matching_products = db.scalars(
        select(Product).where(func.lower(Product.category) == old_cat.lower())
    ).all()

    count = 0
    for p in matching_products:
        p.category = new_cat
        count += 1

    db.commit()

    return {
        "message": f"Successfully updated category from '{old_cat}' to '{new_cat}'",
        "affected_products": count,
    }


# =========================================================================
# USER MANAGEMENT & ACCOUNT STATUS (ADMIN ONLY)
# =========================================================================


@router.get("/users", response_model=list[UserPublic])
def users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return list(db.scalars(select(User).order_by(User.created_at.desc())).all())


@router.patch("/users/{user_id}/status", response_model=UserPublic)
def update_user_status(
    user_id: int,
    payload: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Activate or deactivate customer accounts. Prevents admin self-lockout.
    """
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if target_user.id == current_admin.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own administrative account",
        )

    target_user.is_active = payload.is_active
    db.commit()
    db.refresh(target_user)
    return target_user


# =========================================================================
# STORE SETTINGS & WHATSAPP CONFIGURATION (ADMIN ONLY)
# =========================================================================


@router.get("/settings", response_model=StoreSettingsResponse)
def get_store_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Retrieve store settings including WhatsApp contact configuration.
    """
    settings_dict = get_all_settings(db)
    return StoreSettingsResponse(
        whatsapp_number=settings_dict.get("whatsapp_number", "8485089678"),
        whatsapp_country_code=settings_dict.get("whatsapp_country_code", "91"),
        whatsapp_available=settings_dict.get("whatsapp_available", "true").lower() == "true",
        whatsapp_enquiry_template=settings_dict.get("whatsapp_enquiry_template", ""),
        store_name=settings_dict.get("store_name", "CustomGift"),
        store_email=settings_dict.get("store_email", "support@customgift.dev"),
        store_phone=settings_dict.get("store_phone", "+91 84850 89678"),
    )


@router.patch("/settings", response_model=StoreSettingsResponse)
def update_store_settings(
    payload: StoreSettingsUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Update store and WhatsApp settings.
    """
    updates = {}
    if payload.whatsapp_number is not None:
        updates["whatsapp_number"] = payload.whatsapp_number.strip().replace(" ", "").replace("-", "")
    if payload.whatsapp_country_code is not None:
        updates["whatsapp_country_code"] = payload.whatsapp_country_code.strip().replace("+", "")
    if payload.whatsapp_available is not None:
        updates["whatsapp_available"] = "true" if payload.whatsapp_available else "false"
    if payload.whatsapp_enquiry_template is not None:
        updates["whatsapp_enquiry_template"] = payload.whatsapp_enquiry_template
    if payload.store_name is not None:
        updates["store_name"] = payload.store_name.strip()
    if payload.store_email is not None:
        updates["store_email"] = payload.store_email.strip()
    if payload.store_phone is not None:
        updates["store_phone"] = payload.store_phone.strip()

    if updates:
        update_bulk_settings(db, updates)

    return get_store_settings(db=db, _=current_admin)


# =========================================================================
# CONTACT MANAGEMENT MODULE (ADMIN ONLY)
# =========================================================================


@router.get("/contact-messages", response_model=ContactListResponse)
def get_contact_messages(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Returns paginated contact messages with optional filtering by status and search by name/email.
    """
    stmt = select(ContactMessage)

    if status_filter and status_filter.strip() and status_filter != "all":
        stmt = stmt.where(ContactMessage.status == status_filter.strip())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(ContactMessage.name).like(term),
                func.lower(ContactMessage.email).like(term),
                func.lower(ContactMessage.subject).like(term),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    unread_count = db.scalar(
        select(func.count(ContactMessage.id)).where(ContactMessage.is_read.is_(False))
    ) or 0

    stmt = stmt.order_by(ContactMessage.created_at.desc()).offset(skip).limit(limit)
    items = list(db.scalars(stmt).all())

    return ContactListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
    )


@router.get("/contact-messages/{message_id}", response_model=ContactSubmissionPublic)
def get_contact_message_detail(
    message_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    msg = db.get(ContactMessage, message_id)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found",
        )

    if not msg.is_read:
        msg.is_read = True
        db.commit()
        db.refresh(msg)

    return msg


@router.patch("/contact-messages/{message_id}/status", response_model=ContactSubmissionPublic)
def update_contact_message_status(
    message_id: int,
    payload: ContactStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    msg = db.get(ContactMessage, message_id)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found",
        )

    msg.status = payload.status
    if payload.status == "Resolved":
        msg.is_read = True

    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/contact-messages/{message_id}", response_model=MessageResponse)
def delete_contact_message(
    message_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    msg = db.get(ContactMessage, message_id)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found",
        )

    db.delete(msg)
    db.commit()
    return MessageResponse(message="Contact message deleted successfully")


@router.post("/users/{user_id}/reset-recovery-code", response_model=RecoveryRegenerateResponse)
def admin_reset_user_recovery_code(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    target_user = db.get(User, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    new_code = generate_recovery_code()
    target_user.recovery_code_hash = hash_recovery_code(new_code)
    target_user.recovery_code_created_at = datetime.now(timezone.utc).replace(tzinfo=None)
    target_user.recovery_code_used = False
    target_user.reset_token_hash = None
    target_user.reset_token_expires_at = None

    db.commit()

    return RecoveryRegenerateResponse(
        recovery_code=new_code,
        message=f"New recovery code generated for {target_user.email}. Provide this safely to the account owner.",
    )
