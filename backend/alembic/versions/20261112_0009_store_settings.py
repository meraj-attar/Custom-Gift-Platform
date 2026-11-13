"""create store_settings table

Revision ID: 20261112_0009
Revises: 20261112_0008
Create Date: 2026-11-12 17:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "20261112_0009"
down_revision = "20261112_0008"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()
    if "store_settings" not in tables:
        op.create_table(
            "store_settings",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
        op.create_index("ix_store_settings_id", "store_settings", ["id"], unique=False)
        op.create_index("ix_store_settings_key", "store_settings", ["key"], unique=True)


def downgrade():
    op.drop_index("ix_store_settings_key", table_name="store_settings")
    op.drop_index("ix_store_settings_id", table_name="store_settings")
    op.drop_table("store_settings")
