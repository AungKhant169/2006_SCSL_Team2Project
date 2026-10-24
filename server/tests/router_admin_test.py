import pytest
from fastapi import status
from sqlalchemy.exc import OperationalError

from core import school_import
from core.dataset_update import DatasetUpdateError, SchoolDatasetUpdater
from models.school_record import SchoolInfo, SchoolInfoError
from models.user import UserError
from tests.conftest import client

CSV = ("schools.csv", b"school_key,school_name\na,A\n", "text/csv")
MOE_CSV = school_import.BUNDLED_DIR / "moe.csv"


def error(response, errors):
    body = response.status_code, response.json()["detail"]
    return next((e for e in errors if e.args == body), None)


def headers(auth):
    return {"Authorization": f"Bearer {auth.tokens['access_token']}"} if auth else {}


def update(auth=None, *files, path="/admin/dataset/update"):
    uploads = [("files", file) for file in files]
    return client.post(path, headers=headers(auth), files=uploads or None)


@pytest.fixture
def raw_dir(tmp_path, monkeypatch):
    """Keep uploaded files out of the repository's data/raw folder."""
    monkeypatch.setattr(school_import, "RAW_DIR", tmp_path)
    return tmp_path


class TestAccess:
    def test_requires_authentication(self):
        response = update()
        assert error(response, UserError) == UserError.ACCESS_TOKEN_INVALID

    def test_rejects_plain_users(self, authenticated):
        response = update(authenticated, CSV)
        assert error(response, UserError) == UserError.ADMIN_REQUIRED

    def test_status_is_for_admins_only(self, authenticated):
        response = client.get("/admin/dataset", headers=headers(authenticated))
        assert error(response, UserError) == UserError.ADMIN_REQUIRED

    def test_the_older_route_rejects_plain_users(self, authenticated):
        response = update(authenticated, CSV, path="/school-api/admin/refresh")
        assert error(response, [SchoolInfoError.NOT_ADMIN]) == SchoolInfoError.NOT_ADMIN


class TestUploadValidation:
    def test_no_file(self, admin):
        response = update(admin)
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
        monkeypatch.setattr(school_import, "MAX_UPLOAD_BYTES", 10)
        response = update(admin, ("schools.csv", b"x" * 11, "text/csv"))
        assert error(response, DatasetUpdateError) == DatasetUpdateError.INVALID_FILE

    def test_unrecognised_columns(self, admin, raw_dir):
        response = update(admin, CSV)
        assert error(response, DatasetUpdateError) == DatasetUpdateError.PARSE_FAILURE
        assert SchoolInfo.count() == 0
        assert list(raw_dir.iterdir()) == []


class TestUpdateDataset:
    def test_loads_the_schools_and_logs_the_update(self, admin, raw_dir):
        status_before = client.get("/admin/dataset", headers=headers(admin)).json()
        assert status_before == {"records": 0, "last_update": None}

        response = update(admin, ("moe.csv", MOE_CSV.read_bytes(), "text/csv"))
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["message"].startswith("Database updated successfully")
        assert body["added"] == body["schools"] > 300
        assert body["updated"] == 0

        current = client.get("/admin/dataset", headers=headers(admin)).json()
        assert current["records"] == body["schools"]
        assert current["last_update"].endswith("+00:00")
        # The upload is kept for the next refresh.
        assert (raw_dir / "moe.csv").read_bytes() == MOE_CSV.read_bytes()
        assert not SchoolDatasetUpdater._lock.locked()

    def test_a_second_run_updates_in_place(self, admin, raw_dir):
        first = update(admin, ("moe.csv", MOE_CSV.read_bytes(), "text/csv")).json()
        second = update(admin, ("moe.csv", MOE_CSV.read_bytes(), "text/csv")).json()
        assert (second["added"], second["updated"]) == (0, first["schools"])
        assert SchoolInfo.count() == first["schools"]

    def test_the_older_route_runs_the_same_update(self, admin, raw_dir):
        response = update(
            admin,
            ("moe.csv", MOE_CSV.read_bytes(), "text/csv"),
            path="/school-api/admin/refresh",
        )
        assert response.status_code == status.HTTP_200_OK
        assert SchoolInfo.count() == response.json()["schools"]

    def test_already_running(self, admin):
        assert SchoolDatasetUpdater._lock.acquire(blocking=False)
        try:
            response = update(admin, CSV)
        finally:
            SchoolDatasetUpdater._lock.release()
        assert error(response, DatasetUpdateError) == DatasetUpdateError.ALREADY_RUNNING

    def test_database_unavailable(self, admin, raw_dir, monkeypatch):
        def fail(dataset):
            raise OperationalError("INSERT", {}, Exception("unable to open database"))

        monkeypatch.setattr(school_import, "_write_database", fail)
        response = update(admin, ("moe.csv", MOE_CSV.read_bytes(), "text/csv"))
        assert (
            error(response, DatasetUpdateError)
            == DatasetUpdateError.DATABASE_UNAVAILABLE
        )
        assert not SchoolDatasetUpdater._lock.locked()
        assert list(raw_dir.iterdir()) == []
