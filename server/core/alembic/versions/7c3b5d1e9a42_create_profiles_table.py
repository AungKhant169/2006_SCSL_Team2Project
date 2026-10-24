"""create profiles table

Revision ID: 7c3b5d1e9a42
Revises: 38a4e2cd23a7
Create Date: 2026-10-24 18:40:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c3b5d1e9a42"
down_revision: str | Sequence[str] | None = "38a4e2cd23a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "profiles",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("level", sa.String(), nullable=False),
        sa.Column("score_a", sa.Float(), nullable=True),
        sa.Column("score_b", sa.Float(), nullable=True),
        sa.Column("postal", sa.String(length=6), nullable=True),
        sa.Column("primary_result", sa.String(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_profiles_id"), "profiles", ["id"], unique=False)
    op.create_index(op.f("ix_profiles_user_id"), "profiles", ["user_id"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_profiles_user_id"), table_name="profiles")
    op.drop_index(op.f("ix_profiles_id"), table_name="profiles")
    op.drop_table("profiles")
