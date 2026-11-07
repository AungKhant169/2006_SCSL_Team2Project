"""create school benchmarks table

Revision ID: f4b8c2a1d7e3
Revises: c5a1e07b93d2
Create Date: 2026-11-07 09:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f4b8c2a1d7e3"
down_revision: str | Sequence[str] | None = "c5a1e07b93d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "school_benchmarks",
        sa.Column("school_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("measure", sa.String(length=10), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_school_benchmarks_id"), "school_benchmarks", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_school_benchmarks_school_id"),
        "school_benchmarks",
        ["school_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_school_benchmarks_school_id"), table_name="school_benchmarks"
    )
    op.drop_index(op.f("ix_school_benchmarks_id"), table_name="school_benchmarks")
    op.drop_table("school_benchmarks")
