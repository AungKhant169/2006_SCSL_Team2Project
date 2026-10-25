from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile

from core.authenticator import get_admin_requester
from core.dataset_export import SchoolDatasetExporter
from core.dataset_update import SchoolDatasetUpdater
from models.dataset_update import DatasetUpdate
from models.school_record import SchoolInfo
from schemas.school_payload import DatasetStatus, SchoolUpdateResult

# Every route here is administrator-only; the dependency applies to the whole router.
router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(get_admin_requester)]
)


@router.get("/dataset", response_model=DatasetStatus)
def dataset_status():
    return DatasetStatus(
        records=SchoolInfo.count(), last_update=DatasetUpdate.last_time()
    )


# The files are optional so that a missing one gets the SRS error message instead of a generic 422.
@router.post("/dataset/update", response_model=SchoolUpdateResult)
def update_dataset(files: Annotated[list[UploadFile] | None, File()] = None):
    """Upload one or more of the 7 raw CSV files (any file name: each is recognised by its
    columns); files not uploaded are taken from the last upload. Everything is cleaned and
    written in one transaction, or nothing is changed."""
    return SchoolDatasetUpdater.run(files or [])


@router.get("/dataset/export", response_class=Response)
def export_dataset():
    """Download every school, with all its details, as pathsg_schools_YYYYMMDD.csv. Nothing
    about users, saved roadmaps or reviews is included."""
    filename, content = SchoolDatasetExporter.run()
    return Response(
        content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
