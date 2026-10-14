import json
import math
from pathlib import Path

from sqlalchemy import select

from models.base import SessionLocal
from models.school_record import SchoolInfo

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "schools.json"
INT_COLS = {
    "cca_count",
    "subjects_count",
    "moe_programmes_count",
    "rank_2017",
    "psle_2017_cutoff",
    "olevel_track",
    "places_taken_phase2b",
}
LIST_COLS = {"cca_list", "subjects_list", "moe_programmes"}


def clean_row(row: dict) -> dict:
    out = {}
    for key, value in row.items():
        if key not in SchoolInfo.__table__.columns:
            continue
        if isinstance(value, float) and math.isnan(value):
            value = None
        if isinstance(value, str):
            value = value.strip() or None
        if key in INT_COLS and value is not None:
            value = int(value)
        if key in LIST_COLS:
            value = value or []
        out[key] = value
    return out


def main() -> None:
    rows = [clean_row(r) for r in json.loads(DATA_FILE.read_text(encoding="utf-8"))]
    with SessionLocal() as session:
        existing = {s.school_key: s for s in session.scalars(select(SchoolInfo))}
        for row in rows:
            if school := existing.get(row["school_key"]):
                for key, value in row.items():
                    setattr(school, key, value)
            else:
                session.add(SchoolInfo(**row))
        session.commit()
    print(f"Loaded {len(rows)} schools")


if __name__ == "__main__":
    main()
