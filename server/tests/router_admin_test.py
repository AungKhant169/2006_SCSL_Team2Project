import pytest
from fastapi import status
from sqlalchemy.exc import OperationalError

from core import dataset_update
from core.dataset_update import DatasetUpdateError, SchoolDatasetUpdater
from models.user import UserError
from tests.conftest import client

CSV = ("schools.csv", b"school_key,school_name\na,A\n", "text/csv")


def error(response, errors):
    body = response.status_code, response.json()["detail"]
    return next((e for e in errors if e.args == body), None)


def update(auth=None, file=CSV):
    headers = {"Authorization": f"Bearer {auth.tokens['access_token']}"} if auth else {}
    files = {"file": file} if file else None
    return client.post("/admin/dataset/update", headers=headers, files=files)


@pytest.fixture
def pipeline(monkeypatch):
    """Replace the unimplemented pipeline stages with ones that succeed."""
    monkeypatch.setattr(SchoolDatasetUpdater, "parse_dataset", lambda content: [])
    monkeypatch.setattr(SchoolDatasetUpdater, "standardize_records", lambda rows: [])
    monkeypatch.setattr(
        SchoolDatasetUpdater, "bulk_write_records", lambda session, records: None
    )


class TestAccess:
    def test_requires_authentication(self):
        response = update()
        assert error(response, UserError) == UserError.ACCESS_TOKEN_INVALID

    def test_rejects_plain_users(self, authenticated):
        response = update(authenticated)
        assert error(response, UserError) == UserError.ADMIN_REQUIRED


class TestUploadValidation:
    def test_no_file(self, admin):
        response = update(admin, file=None)
        assert (
            error(response, DatasetUpdateError) == DatasetUpdateError.NO_FILE_SELECTED
        )

    @pytest.mark.parametrize(
        "file",
        [
            pytest.param(("schools.txt", b"a,b\n1,2\n", "text/plain"), id="not-csv"),
            pytest.param(("schools.csv", b"", "text/csv"), id="empty"),
        ],
    )
    def test_invalid_file(self, admin, file):
        response = update(admin, file)
        assert error(response, DatasetUpdateError) == DatasetUpdateError.INVALID_FILE

    def test_too_large(self, admin, monkeypatch):
        monkeypatch.setattr(dataset_update, "MAX_UPLOAD_BYTES", 10)
        response = update(admin, ("schools.csv", b"x" * 11, "text/csv"))
        assert error(response, DatasetUpdateError) == DatasetUpdateError.INVALID_FILE

    def test_extension_is_case_insensitive(self, admin, pipeline):
        response = update(admin, ("SCHOOLS.CSV", b"a,b\n1,2\n", "text/csv"))
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestUpdateDataset:
    def test_not_implemented(self, admin):
        response = update(admin)
        assert error(response, DatasetUpdateError) == DatasetUpdateError.NOT_IMPLEMENTED
        # A failed run must not leave the update locked.
        assert not SchoolDatasetUpdater._lock.locked()

    def test_already_running(self, admin):
        assert SchoolDatasetUpdater._lock.acquire(blocking=False)
        try:
            response = update(admin)
        finally:
            SchoolDatasetUpdater._lock.release()
        assert error(response, DatasetUpdateError) == DatasetUpdateError.ALREADY_RUNNING

    def test_success(self, admin, pipeline):
        response = update(admin)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not SchoolDatasetUpdater._lock.locked()

    def test_database_unavailable(self, admin, pipeline, monkeypatch):
        def fail(session, records):
            raise OperationalError("INSERT", {}, Exception("unable to open database"))

        monkeypatch.setattr(SchoolDatasetUpdater, "bulk_write_records", fail)
        response = update(admin)
        assert (
            error(response, DatasetUpdateError)
            == DatasetUpdateError.DATABASE_UNAVAILABLE
        )
        assert not SchoolDatasetUpdater._lock.locked()
