"""add persistent wishlist

Revision ID: 20260923_0002
Revises: 20260922_0001
Create Date: 2026-09-23
"""
from alembic import op
import sqlalchemy as sa


revision = "20260923_0002"
down_revision = "20260922_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wishlist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),
    )
    op.create_index("ix_wishlist_items_user_id", "wishlist_items", ["user_id"])
    op.create_index("ix_wishlist_items_product_id", "wishlist_items", ["product_id"])
    op.create_index("ix_wishlist_items_created_at", "wishlist_items", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_wishlist_items_created_at", table_name="wishlist_items")
    op.drop_index("ix_wishlist_items_product_id", table_name="wishlist_items")
    op.drop_index("ix_wishlist_items_user_id", table_name="wishlist_items")
    op.drop_table("wishlist_items")
