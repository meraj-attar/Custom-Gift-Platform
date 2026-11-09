from pydantic import BaseModel


class PaymentOrderRequest(BaseModel):
    order_id: int


class PaymentOrderResponse(BaseModel):
    mode: str
    order_id: int
    razorpay_order_id: str
    amount: int
    currency: str = "INR"
    key_id: str | None = None


class PaymentVerifyRequest(BaseModel):
    order_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class DemoPaymentRequest(BaseModel):
    order_id: int
