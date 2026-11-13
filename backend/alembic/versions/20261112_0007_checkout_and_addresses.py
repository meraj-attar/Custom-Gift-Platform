"""create addresses table and add checkout columns to orders

Revision ID: 20261112_0007
Revises: 20261112_0006
Create Date: 2026-11-12
"""
import sqlalchemy as sa
from alembic import op

revision = "20261112_0007"
down_revision = "20261112_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create addresses table
    op.create_table(
        "addresses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("full_name", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("address_line1", sa.String(length=255), nullable=False),
        sa.Column("address_line2", sa.String(length=255), nullable=True),
        sa.Column("landmark", sa.String(length=150), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("state", sa.String(length=100), nullable=False),
        sa.Column("pincode", sa.String(length=10), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_addresses_user_id", "addresses", ["user_id"])
    op.create_index("ix_addresses_is_default", "addresses", ["is_default"])
    op.create_index("ix_addresses_created_at", "addresses", ["created_at"])

    # 2. Add columns to orders table
    op.add_column("orders", sa.Column("address_line2", sa.String(length=255), nullable=True))
    op.add_column("orders", sa.Column("landmark", sa.String(length=150), nullable=True))
    op.add_column("orders", sa.Column("delivery_option", sa.String(length=30), nullable=False, server_default="standard"))
    op.add_column("orders", sa.Column("shipping_fee", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0.00"))
    op.add_column("orders", sa.Column("subtotal", sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column("orders", sa.Column("estimated_delivery", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "estimated_delivery")
    op.drop_column("orders", "subtotal")
    op.drop_column("orders", "shipping_fee")
    op.drop_column("orders", "delivery_option")
    op.drop_column("orders", "landmark")
    op.drop_column("orders", "address_line2")

    op.drop_index("ix_addresses_created_at", table_name="addresses")
    op.drop_index("ix_addresses_is_default", table_name="addresses")
    op.drop_index("ix_addresses_user_id", table_name="addresses")
    op.drop_table("addresses")
