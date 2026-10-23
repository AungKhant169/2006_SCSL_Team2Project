from fastapi import APIRouter, Depends, UploadFile, status

from core.authenticator import get_admin_requester
from core.dataset_update import SchoolDatasetUpdater

# Every route here is administrator-only; the dependency applies to the whole router.
router = APIRouter(
    prefix="/admin", tags=["admin"], dependencies=[Depends(get_admin_requester)]
)


# The file is optional so that a missing one gets the SRS error message instead of a generic 422.
@router.post("/dataset/update", status_code=status.HTTP_204_NO_CONTENT)
def update_dataset(file: UploadFile | None = None):
    SchoolDatasetUpdater.run(file)
