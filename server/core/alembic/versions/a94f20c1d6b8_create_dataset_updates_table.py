"""create dataset_updates table

Revision ID: a94f20c1d6b8
Revises: 7c3b5d1e9a42
Create Date: 2026-10-24 19:05:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a94f20c1d6b8"
down_revision: str | Sequence[str] | None = "7c3b5d1e9a42"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "dataset_updates",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("schools", sa.Integer(), nullable=False),
        sa.Column("added", sa.Integer(), nullable=False),
        sa.Column("updated", sa.Integer(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_dataset_updates_id"), "dataset_updates", ["id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_dataset_updates_id"), table_name="dataset_updates")
    op.drop_table("dataset_updates")
