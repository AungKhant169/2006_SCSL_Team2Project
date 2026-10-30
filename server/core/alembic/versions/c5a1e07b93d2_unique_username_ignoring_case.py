"""make usernames case-insensitive

Revision ID: c5a1e07b93d2
Revises: 26d1f2dfce08
Create Date: 2026-10-30 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c5a1e07b93d2"
down_revision: str | Sequence[str] | None = "26d1f2dfce08"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(
        "ix_users_username_lower", "users", [sa.text("lower(username)")], unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_users_username_lower", table_name="users")
