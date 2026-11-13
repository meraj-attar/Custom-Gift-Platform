"""add status and indexes to contact_messages

Revision ID: 20261111_0004
Revises: 20261109_0003
Create Date: 2026-11-11
"""
import sqlalchemy as sa
from alembic import op

revision = "20261111_0004"
down_revision = "20261109_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "contact_messages",
        sa.Column("status", sa.String(length=30), nullable=False, server_default="New"),
    )
    op.create_index("ix_contact_messages_status", "contact_messages", ["status"])
    op.create_index("ix_contact_messages_created_at", "contact_messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_contact_messages_created_at", table_name="contact_messages")
    op.drop_index("ix_contact_messages_status", table_name="contact_messages")
    op.drop_column("contact_messages", "status")
