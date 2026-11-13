from pydantic import BaseModel


class PaymentConfigResponse(BaseModel):
    key_id: str | None
    currency: str = "INR"
    enabled: bool


class PaymentOrderRequest(BaseModel):
    order_id: int


class PaymentOrderResponse(BaseModel):
    mode: str = "razorpay"
    order_id: int
    order_number: str
    razorpay_order_id: str
    amount: int  # in paise
    currency: str = "INR"
    key_id: str | None = None
    business_name: str = "CustomGift"
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None


class PaymentVerifyRequest(BaseModel):
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentFailureRequest(BaseModel):
    order_id: int
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None
    error_code: str | None = None
    error_description: str | None = None
    reason: str | None = "failed"


class DemoPaymentRequest(BaseModel):
    order_id: int

