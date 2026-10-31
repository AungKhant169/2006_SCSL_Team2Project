"""Puts a cleaned dataset in the database, and remembers the raw files on disk.

Used by both the admin endpoint (POST /school-api/admin/refresh) and the command
line script (python -m scripts.refresh_school_data).
"""

import logging
from pathlib import Path

from sqlalchemy import delete, insert, select
from sqlalchemy.exc import InterfaceError, OperationalError

from core.school_cleaning import (
    FILE_KEYS,
    CleanDataset,
    SchoolDataError,
    clean_schools,
    identify_frame,
    read_csv_bytes,
)
from core.settings import settings
from models.base import SessionLocal
from models.dataset_update import DatasetUpdate
from models.school_record import (
    SchoolAid,
    SchoolBus,
    SchoolCca,
    SchoolInfo,
    SchoolMoeProgramme,
    SchoolProgramme,
    SchoolScholarship,
    SchoolSubject,
)

log = logging.getLogger(__name__)

# Largest accepted upload, per file (the spec leaves this TBD).
MAX_UPLOAD_BYTES = int(settings.school_max_upload_mb * 1024 * 1024)


class InvalidUploadError(ValueError):
    """Not a .csv, empty, or too big."""


class DatabaseUnavailableError(RuntimeError):
    """The database could not be reached."""


# The files shipped with the code (data/raw/ in the repo): the starting point.
BUNDLED_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
# Where files uploaded by an admin are kept. In Docker, point SCHOOL_RAW_DIR at the
# /data volume (the app user can only write there, and it survives rebuilds).
RAW_DIR = settings.school_raw_dir or BUNDLED_DIR


def stored_files() -> dict[str, bytes]:
    """{'general': bytes, ...}: the latest upload of each file, else the bundled copy."""
    files = {}
    for key in FILE_KEYS:
        for folder in (RAW_DIR, BUNDLED_DIR):
            if (path := folder / f"{key}.csv").exists():
                files[key] = path.read_bytes()
                break
    return files


def validate_upload(filename: str, data: bytes) -> None:
    if (
        not filename.lower().endswith(".csv")
        or not data.strip()
        or len(data) > MAX_UPLOAD_BYTES
    ):
        raise InvalidUploadError(
            f"{filename!r}: not a .csv, empty, or over {MAX_UPLOAD_BYTES} bytes"
        )


def sort_uploads(uploads: dict[str, bytes]) -> dict[str, bytes]:
    """{'any name.csv': bytes} -> {'subjects': bytes}, recognised by the column headers."""
    out = {}
    for filename, data in uploads.items():
        validate_upload(filename, data)
        key = identify_frame(read_csv_bytes(data, filename))
        if key is None:
            raise SchoolDataError(
                f"'{filename}' is not one of the {len(FILE_KEYS)} expected datasets (unrecognised columns)."
            )
        if key in out:
            raise SchoolDataError(f"Two uploaded files look like the '{key}' file.")
        out[key] = data
    return out


def _write_database(dataset: CleanDataset) -> dict:
    valid_columns = set(SchoolInfo.__table__.columns.keys()) - {"id"}
    new_keys = {row["school_key"] for row in dataset.schools}

    with SessionLocal() as session:
        existing = {s.school_key: s for s in session.scalars(select(SchoolInfo))}
        for row in dataset.schools:
            values = {c: row.get(c) for c in valid_columns}
            if school := existing.get(row["school_key"]):
                for column, value in values.items():
                    setattr(school, column, value)
            else:
                session.add(SchoolInfo(**values))
        session.flush()

        ids = {
            key: id_
            for key, id_ in session.execute(
                select(SchoolInfo.school_key, SchoolInfo.id)
            )
        }

        # The child tables are rebuilt from scratch every time.
        for model, rows in (
            (
                SchoolSubject,
                [
                    {"school_id": ids[r["school_key"]], "name": r["name"]}
                    for r in dataset.subjects
                ],
            ),
            (
                SchoolMoeProgramme,
                [
                    {"school_id": ids[r["school_key"]], "name": r["name"]}
                    for r in dataset.moe_programmes
                ],
            ),
            (
                SchoolBus,
                [
                    {"school_id": ids[r["school_key"]], "bus_no": r["bus_no"]}
                    for r in dataset.buses
                ],
            ),
            (
                SchoolCca,
                [
                    {
                        "school_id": ids[r["school_key"]],
                        **{k: v for k, v in r.items() if k != "school_key"},
                    }
                    for r in dataset.ccas
                ],
            ),
            (
                SchoolProgramme,
                [
                    {
                        "school_id": ids[r["school_key"]],
                        **{k: v for k, v in r.items() if k != "school_key"},
                    }
                    for r in dataset.programmes
                ],
            ),
            (
                SchoolAid,
                [
                    {
                        "school_id": ids[r["school_key"]],
                        **{k: v for k, v in r.items() if k != "school_key"},
                    }
                    for r in dataset.financial_aid
                ],
            ),
            (
                SchoolScholarship,
                [
                    {
                        "school_id": ids[r["school_key"]],
                        **{k: v for k, v in r.items() if k != "school_key"},
                    }
                    for r in dataset.scholarships
                ],
            ),
        ):
            session.execute(delete(model))
            if rows:
                session.execute(insert(model), rows)
        added = len(new_keys - set(existing))
        updated = len(new_keys & set(existing))
        session.add(
            DatasetUpdate(schools=len(dataset.schools), added=added, updated=updated)
        )
        session.commit()

    return {
        "schools": len(dataset.schools),
        "added": added,
        "updated": updated,
        # kept (other features may point at them) but no longer in the files
        "not_in_files": len(set(existing) - new_keys),
        "subjects": len(dataset.subjects),
        "ccas": len(dataset.ccas),
        "moe_programmes": len(dataset.moe_programmes),
        "buses": len(dataset.buses),
        "programmes": len(dataset.programmes),
        "financial_aid": len(dataset.financial_aid),
        "scholarships": len(dataset.scholarships),
        "warnings": dataset.warnings,
    }


def refresh(uploads: dict[str, bytes] | None = None) -> dict:
    """Clean + load. `uploads` replace the stored files of the same kind; anything
    not uploaded is taken from RAW_DIR. Nothing is saved unless everything is valid."""
    sorted_uploads = sort_uploads(uploads or {})
    files = stored_files() | sorted_uploads
    missing = [key for key in FILE_KEYS if key not in files]
    if missing:
        raise SchoolDataError(
            "Still missing: "
            + ", ".join(missing)
            + f". Upload them (or put them in {BUNDLED_DIR})."
        )

    raw = {key: read_csv_bytes(data, key) for key, data in files.items()}
    try:
        dataset = clean_schools(raw)  # raises before the database is touched
    except SchoolDataError:
        raise
    except Exception as error:  # noqa: BLE001 - any problem in the data must give the update-failed message
        raise SchoolDataError(f"Unexpected problem while cleaning: {error!r}")

    # Everything is written in ONE transaction: any error rolls all of it back.
    try:
        summary = _write_database(dataset)
    except (OperationalError, InterfaceError) as error:
        log.warning("School update: database unreachable: %s", error)
        raise DatabaseUnavailableError(str(error))
    except Exception as error:  # noqa: BLE001 - any write failure: already rolled back
        log.warning("School update: could not write the data: %r", error)
        raise SchoolDataError(f"Could not write the data: {error}")

    if sorted_uploads:  # only now keep the new files for next time
        try:
            RAW_DIR.mkdir(parents=True, exist_ok=True)
            for key, data in sorted_uploads.items():
                (RAW_DIR / f"{key}.csv").write_bytes(data)
        except OSError as error:  # the database is already updated, so do not fail
            log.warning("Could not save uploaded files to %s: %s", RAW_DIR, error)
            summary["warnings"].append(
                "The database was updated, but the uploaded files could not be saved for next time."
            )
    return summary
