"""Clean the raw CSV files in data/raw/ and load them into the database.

Run from server/:
    python -m scripts.refresh_school_data              # always reload
    python -m scripts.refresh_school_data --if-empty   # only if there are no schools yet
"""

import sys

from sqlalchemy import func, select

from core.school_import import refresh
from models.base import SessionLocal
from models.school_record import SchoolInfo


def main(argv: list[str]) -> None:
    if "--if-empty" in argv:
        with SessionLocal() as session:
            if session.scalar(select(func.count()).select_from(SchoolInfo)):
                print("Schools already loaded, nothing to do.")
                return
    for key, value in refresh().items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main(sys.argv[1:])
