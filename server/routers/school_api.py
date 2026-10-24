import logging
from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile

from core.authenticator import Requester
from core.school_cleaning import SchoolDataError
from core.school_import import DatabaseUnavailableError, InvalidUploadError, refresh
from models.school_record import SchoolInfo, SchoolInfoError
from schemas.school_payload import (
    SchoolFilter,
    SchoolInfoDetail,
    SchoolPage,
    SchoolUpdateResult,
)

router = APIRouter(prefix="/school-api", tags=["school-api"])
log = logging.getLogger(__name__)

SUCCESS_MESSAGE = "Database updated successfully with the latest Singapore school data"


@router.get("", response_model=SchoolPage)
def list_schools(filters: Annotated[SchoolFilter, Query()]):
    items, total = SchoolInfo.search(**filters.model_dump())
    return SchoolPage(
        total=total, limit=filters.limit, offset=filters.offset, items=items
    )


# Fixed paths must stay above "/{school_key}" or they would be read as a school key.
@router.get("/options", response_model=dict[str, list[str]])
def filter_options():
    """Every value each filter accepts, for building dropdowns."""
    return SchoolInfo.options()


@router.post("/admin/refresh", response_model=SchoolUpdateResult)
def refresh_school_data(
    user: Requester, files: Annotated[list[UploadFile] | None, File()] = None
):
    """Admin only. Upload one or more of the 7 raw CSV files (any file name: each is
    recognised by its columns); files not uploaded are taken from the last upload.
    Everything is cleaned and written in one transaction, or nothing is changed."""
    if not user.is_admin:
        raise SchoolInfoError.NOT_ADMIN
    files = files or []
    if not files:
        raise SchoolInfoError.NO_FILE
    try:
        uploads = {f.filename or f"file{i}": f.file.read() for i, f in enumerate(files)}
        summary = refresh(uploads)
    except InvalidUploadError as error:
        log.warning("School update rejected: %s", error)
        raise SchoolInfoError.INVALID_FILE
    except SchoolDataError as error:
        log.warning("School update failed: %s", error)
        raise SchoolInfoError.UPDATE_FAILED
    except DatabaseUnavailableError:
        raise SchoolInfoError.DATABASE_UNREACHABLE
    return {**summary, "message": SUCCESS_MESSAGE}


@router.get("/{school_key}", response_model=SchoolInfoDetail)
def get_school(school_key: str):
    return SchoolInfo.get_or_404(school_key)
