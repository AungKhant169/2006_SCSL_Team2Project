import logging
import threading

from fastapi import UploadFile, status

from core import school_import
from core.exceptions import HttpError
from core.school_cleaning import SchoolDataError
from core.school_import import DatabaseUnavailableError, InvalidUploadError

log = logging.getLogger(__name__)

SUCCESS_MESSAGE = "Database updated successfully with the latest Singapore school data"


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


class SchoolDatasetUpdater:
    """Replaces the stored school records with the contents of uploaded CSV files (UC-5.1).

    The cleaning and the all-or-nothing write are in core/school_import.py (REQ-5.4, REQ-5.5).
    """

    # Held for the whole run, so only one update can be in flight (REQ-5.2).
    _lock = threading.Lock()

    @classmethod
    def run(cls, files: list[UploadFile]) -> dict:
        """Load the files and return the summary of what changed."""
        uploads = cls.read_uploads(files)
        if not cls._lock.acquire(blocking=False):
            raise DatasetUpdateError.ALREADY_RUNNING
        try:
            return {**school_import.refresh(uploads), "message": SUCCESS_MESSAGE}
        except InvalidUploadError as error:
            log.warning("School update rejected: %s", error)
            raise DatasetUpdateError.INVALID_FILE
        except SchoolDataError as error:
            log.warning("School update failed: %s", error)
            raise DatasetUpdateError.PARSE_FAILURE
        except DatabaseUnavailableError:
            # The driver could not reach or use the database (REQ-5.10).
            raise DatasetUpdateError.DATABASE_UNAVAILABLE
        finally:
            cls._lock.release()

    @classmethod
    def read_uploads(cls, files: list[UploadFile]) -> dict[str, bytes]:
        """Return {file name: contents}. Each file must be a non-empty .csv within the size limit (REQ-5.8)."""
        if not files or any(not f.filename for f in files):
            raise DatasetUpdateError.NO_FILE_SELECTED
        uploads = {}
        for file in files:
            # Read one byte past the limit, so an oversized file is rejected without loading all of it.
            content = file.file.read(school_import.MAX_UPLOAD_BYTES + 1)
            try:
                school_import.validate_upload(file.filename, content)
            except InvalidUploadError:
                raise DatasetUpdateError.INVALID_FILE
            uploads[file.filename] = content
        return uploads
