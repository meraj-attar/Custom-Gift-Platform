"""add password recovery and reset token fields to users table

Revision ID: 20261111_0005
Revises: 20261111_0004
Create Date: 2026-11-11
"""
import sqlalchemy as sa
from alembic import op

revision = "20261111_0005"
down_revision = "20261111_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("recovery_code_hash", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("recovery_code_created_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("recovery_code_used", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("reset_token_hash", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("reset_token_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="1"))

    op.create_index("ix_users_reset_token_hash", "users", ["reset_token_hash"])


def downgrade() -> None:
    op.drop_index("ix_users_reset_token_hash", table_name="users")
    op.drop_column("users", "token_version")
    op.drop_column("users", "reset_token_expires_at")
    op.drop_column("users", "reset_token_hash")
    op.drop_column("users", "recovery_code_used")
    op.drop_column("users", "recovery_code_created_at")
    op.drop_column("users", "recovery_code_hash")
