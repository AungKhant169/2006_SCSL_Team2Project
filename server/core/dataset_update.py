import threading

from fastapi import UploadFile, status
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from core.exceptions import HttpError
from models.base import SessionLocal

# The SRS leaves the maximum file size TBD (REQ-5.8). The bundled schools dataset is about 1 MB.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class DatasetUpdateError(HttpError):
    ALREADY_RUNNING = (
        status.HTTP_409_CONFLICT,
        "A database update is already running. Please wait for it to finish.",
    )
    NO_FILE_SELECTED = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Please select a CSV file before updating the database.",
    )
    INVALID_FILE = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Invalid file. Please upload a non-empty .csv file within the size limit.",
    )
    PARSE_FAILURE = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Database Update Failed: Unable to process dataset format. Please check source data and try again.",
    )
    DATABASE_UNAVAILABLE = (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Database Update Failed: Unable to connect to local database. Please try again later.",
    )
    # Remove once the pipeline below is implemented.
    NOT_IMPLEMENTED = (
        status.HTTP_501_NOT_IMPLEMENTED,
        "The school database update has not been implemented yet.",
    )


class SchoolDatasetUpdater:
    """Replaces the stored school records with the contents of an uploaded CSV file (UC-5.1)."""

    # Held for the whole run, so only one update can be in flight (REQ-5.2).
    _lock = threading.Lock()

    @classmethod
    def run(cls, file: UploadFile | None) -> None:
        content = cls.read_upload(file)
        if not cls._lock.acquire(blocking=False):
            raise DatasetUpdateError.ALREADY_RUNNING
        try:
            records = cls.standardize_records(cls.parse_dataset(content))
            # A single transaction: a failure anywhere leaves the existing records
            # unchanged, because nothing is committed (REQ-5.5).
            with SessionLocal() as session:
                cls.bulk_write_records(session, records)
                session.commit()
        except OperationalError:
            # The driver could not reach or use the database (REQ-5.10).
            raise DatasetUpdateError.DATABASE_UNAVAILABLE
        finally:
            cls._lock.release()

    @classmethod
    def read_upload(cls, file: UploadFile | None) -> bytes:
        """Return the file's contents once it is a non-empty .csv within the size limit (REQ-5.8)."""
        if file is None or not file.filename:
            raise DatasetUpdateError.NO_FILE_SELECTED
        # Read one byte past the limit, so an oversized file is rejected without loading all of it.
        content = file.file.read(MAX_UPLOAD_BYTES + 1)
        if (
            not file.filename.lower().endswith(".csv")
            or not content
            or len(content) > MAX_UPLOAD_BYTES
        ):
            raise DatasetUpdateError.INVALID_FILE
        return content

    @classmethod
    def parse_dataset(cls, content: bytes) -> list[dict]:
        """Read the CSV rows. Raise PARSE_FAILURE on missing required columns or malformed rows (REQ-5.9)."""
        raise DatasetUpdateError.NOT_IMPLEMENTED

    @classmethod
    def standardize_records(cls, rows: list[dict]) -> list[dict]:
        """Map the rows onto SchoolInfo columns: trim text, handle empty values, convert numbers and split list fields (REQ-5.4).

        clean_row in scripts/load_school_data.py already does most of this for the bundled JSON file.
        """
        raise DatasetUpdateError.NOT_IMPLEMENTED

    @classmethod
    def bulk_write_records(cls, session: Session, records: list[dict]) -> None:
        """Add new schools and update existing ones, matched by school_key. Does not commit (REQ-5.5)."""
        raise DatasetUpdateError.NOT_IMPLEMENTED
