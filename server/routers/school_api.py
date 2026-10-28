from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile

from core.authenticator import Requester
from core.dataset_update import SchoolDatasetUpdater
from models.school_record import SchoolInfo, SchoolInfoError
from schemas.school_payload import (
    SchoolFilter,
    SchoolInfoDetail,
    SchoolPage,
    SchoolUpdateResult,
)

router = APIRouter(prefix="/school-api", tags=["school-api"])


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
    """Admin only: the same update as POST /admin/dataset/update. Upload one or more of the
    raw CSV files (any file name: each is recognised by its columns); files not uploaded
    are taken from the last upload. Everything is cleaned and written in one transaction,
    or nothing is changed. Unlike /admin/*, this also accepts the ADMIN_USERNAMES accounts."""
    if not user.is_admin:
        raise SchoolInfoError.NOT_ADMIN
    return SchoolDatasetUpdater.run(files or [])


@router.get("/{school_key}", response_model=SchoolInfoDetail)
def get_school(school_key: str):
    return SchoolInfo.get_or_404(school_key)
