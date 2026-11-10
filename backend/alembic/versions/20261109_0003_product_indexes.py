"""add product price, created_at, and rating indexes for filtering and sorting

Revision ID: 20261109_0003
Revises: 20260923_0002
Create Date: 2026-11-09
"""
from alembic import op


revision = "20261109_0003"
down_revision = "20260923_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_products_price", "products", ["price"])
    op.create_index("ix_products_created_at", "products", ["created_at"])
    op.create_index("ix_products_rating", "products", ["rating"])


def downgrade() -> None:
    op.drop_index("ix_products_rating", table_name="products")
    op.drop_index("ix_products_created_at", table_name="products")
    op.drop_index("ix_products_price", table_name="products")
