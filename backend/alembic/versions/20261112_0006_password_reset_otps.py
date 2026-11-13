"""create password_reset_otps table

Revision ID: 20261112_0006
Revises: 20261111_0005
Create Date: 2026-11-12
"""
import sqlalchemy as sa
from alembic import op

revision = "20261112_0006"
down_revision = "20261111_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_otps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("otp_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_password_reset_otps_user_id", "password_reset_otps", ["user_id"])
    op.create_index("ix_password_reset_otps_expires_at", "password_reset_otps", ["expires_at"])
    op.create_index("ix_password_reset_otps_is_used", "password_reset_otps", ["is_used"])
    op.create_index("ix_password_reset_otps_created_at", "password_reset_otps", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_password_reset_otps_created_at", table_name="password_reset_otps")
    op.drop_index("ix_password_reset_otps_is_used", table_name="password_reset_otps")
    op.drop_index("ix_password_reset_otps_expires_at", table_name="password_reset_otps")
    op.drop_index("ix_password_reset_otps_user_id", table_name="password_reset_otps")
    op.drop_table("password_reset_otps")
