"""create payments table

Revision ID: 20261112_0008
Revises: 20261112_0007
Create Date: 2026-11-12 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "20261112_0008"
down_revision = "20261112_0007"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()
    if "payments" not in tables:
        op.create_table(
            "payments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
            sa.Column("razorpay_order_id", sa.String(length=120), nullable=True),
            sa.Column("razorpay_payment_id", sa.String(length=120), nullable=True),
            sa.Column("razorpay_signature", sa.String(length=255), nullable=True),
            sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
            sa.Column("currency", sa.String(length=10), nullable=False, server_default="INR"),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="CREATED"),
            sa.Column("payment_method", sa.String(length=50), nullable=True),
            sa.Column("error_code", sa.String(length=100), nullable=True),
            sa.Column("error_description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_payments_id", "payments", ["id"], unique=False)
        op.create_index("ix_payments_user_id", "payments", ["user_id"], unique=False)
        op.create_index("ix_payments_order_id", "payments", ["order_id"], unique=False)
        op.create_index("ix_payments_razorpay_order_id", "payments", ["razorpay_order_id"], unique=False)
        op.create_index("ix_payments_razorpay_payment_id", "payments", ["razorpay_payment_id"], unique=False)
        op.create_index("ix_payments_status", "payments", ["status"], unique=False)
        op.create_index("ix_payments_created_at", "payments", ["created_at"], unique=False)


def downgrade():
    op.drop_index("ix_payments_created_at", table_name="payments")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_razorpay_payment_id", table_name="payments")
    op.drop_index("ix_payments_razorpay_order_id", table_name="payments")
    op.drop_index("ix_payments_order_id", table_name="payments")
    op.drop_index("ix_payments_user_id", table_name="payments")
    op.drop_index("ix_payments_id", table_name="payments")
    op.drop_table("payments")
