from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Float, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    role = Column(String(20), nullable=False, default="customer", index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    recovery_code_hash = Column(String(128), nullable=True)
    recovery_code_created_at = Column(DateTime, nullable=True)
    recovery_code_used = Column(Boolean, nullable=False, default=False)
    reset_token_hash = Column(String(128), nullable=True, index=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    token_version = Column(Integer, nullable=False, default=1)

    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, index=True, nullable=False)
    category = Column(String(80), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False, index=True)
    description = Column(Text, nullable=False)
    rating = Column(Float, nullable=False, default=4.5, index=True)
    discount_percent = Column(Integer, nullable=False, default=0)
    stock = Column(Integer, nullable=False, default=0)
    customizable = Column(Boolean, nullable=False, default=False)
    delivery_time = Column(String(80), nullable=True)
    material = Column(String(120), nullable=True)
    image_url = Column(String(500), nullable=True)
    needs_image = Column(Boolean, nullable=False, default=False)
    needs_text = Column(Boolean, nullable=False, default=False)
    needs_date = Column(Boolean, nullable=False, default=False)
    max_text_length = Column(Integer, nullable=False, default=120)
    is_featured = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    order_items = relationship("OrderItem", back_populates="product")
    wishlist_items = relationship("WishlistItem", back_populates="product", cascade="all, delete-orphan")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)

    user = relationship("User", back_populates="wishlist_items")
    product = relationship("Product", back_populates="wishlist_items")


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    landmark = Column(String(150), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False, index=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="addresses")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    order_number = Column(String(40), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=False)
    email = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    address_line2 = Column(String(255), nullable=True)
    landmark = Column(String(150), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False)

    delivery_option = Column(String(30), nullable=False, default="standard")
    shipping_fee = Column(Numeric(10, 2), nullable=False, default=0.00)
    subtotal = Column(Numeric(10, 2), nullable=True)
    estimated_delivery = Column(String(80), nullable=True)

    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(20), nullable=False)
    payment_status = Column(String(30), nullable=False, default="PENDING", index=True)
    payment_id = Column(String(120), nullable=True)
    razorpay_order_id = Column(String(120), nullable=True)
    order_status = Column(String(30), nullable=False, default="PLACED", index=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_title = Column(String(200), nullable=False)
    product_image_url = Column(String(500), nullable=True)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    occasion = Column(String(80), nullable=True)
    custom_text = Column(Text, nullable=True)
    event_date = Column(Date, nullable=True)
    custom_image_url = Column(String(500), nullable=True)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False)
    subject = Column(String(180), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="New", index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    is_read = Column(Boolean, nullable=False, default=False)


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    otp_hash = Column(String(128), nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    attempts = Column(Integer, nullable=False, default=0)
    is_used = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)

    user = relationship("User", backref="reset_otps")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)

    razorpay_order_id = Column(String(120), nullable=True, index=True)
    razorpay_payment_id = Column(String(120), nullable=True, index=True)
    razorpay_signature = Column(String(255), nullable=True)

    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(30), nullable=False, default="CREATED", index=True)  # CREATED, PENDING, SUCCESS, FAILED, CANCELLED
    payment_method = Column(String(50), nullable=True)  # e.g. "razorpay", "upi", "card", "netbanking"

    error_code = Column(String(100), nullable=True)
    error_description = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = relationship("User", backref="payments")
    order = relationship("Order", backref="payments")


class StoreSetting(Base):
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)



