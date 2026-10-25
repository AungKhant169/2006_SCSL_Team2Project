import csv
import io
import re
from datetime import datetime, timezone

import pytest
from fastapi import status
from sqlalchemy.exc import OperationalError

from core import school_import
from core.dataset_export import DatasetExportError, SchoolDatasetExporter
from core.dataset_update import DatasetUpdateError, SchoolDatasetUpdater
from models.base import SessionLocal
from models.school_record import (
    SchoolBus,
    SchoolCca,
    SchoolInfo,
    SchoolInfoError,
    SchoolMoeProgramme,
    SchoolSubject,
)
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


EXPORT = "/admin/dataset/export"


def add_schools():
    """Two schools: the first with its details and list entries filled in, the second bare."""
    with SessionLocal() as db:
        db.add_all(
            [
                SchoolInfo(
                    school_key="alpha primary",
                    school_name="ALPHA PRIMARY SCHOOL",
                    address="1 Alpha Road",
                    postal_code="012345",
                    latitude=1.3,
                    longitude=103.8,
                    principal_name="MR TAN",
                    mainlevel_code="PRIMARY",
                    rank_2017=5,
                    places_taken_phase2b=120,
                    subjects=[
                        SchoolSubject(name="Mathematics"),
                        SchoolSubject(name="Art"),
                    ],
                    ccas=[
                        SchoolCca(
                            grouping="CHESS", section="PRIMARY", generic_name="CLUBS"
                        ),
                        SchoolCca(
                            grouping="AIKIDO",
                            section="PRIMARY",
                            generic_name="PHYSICAL SPORTS",
                            customised_name="MARTIAL ARTS",
                        ),
                    ],
                    moe_programme_rows=[SchoolMoeProgramme(name="LEARNING SUPPORT")],
                    bus_rows=[SchoolBus(bus_no="965"), SchoolBus(bus_no="964")],
                ),
                SchoolInfo(school_key="beta secondary", school_name="BETA SECONDARY"),
            ]
        )
        db.commit()


def export(auth=None):
    return client.get(EXPORT, headers=headers(auth))


def rows(response):
    return list(csv.DictReader(io.StringIO(response.text)))


class TestExportAccess:
    def test_requires_authentication(self):
        response = export()
        assert error(response, UserError) == UserError.ACCESS_TOKEN_INVALID

    def test_rejects_plain_users(self, authenticated):
        add_schools()
        response = export(authenticated)
        assert error(response, UserError) == UserError.ADMIN_REQUIRED
        assert "ALPHA" not in response.text


class TestExportDataset:
    def test_downloads_a_csv_named_for_the_date(self, admin):
        add_schools()
        response = export(admin)
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"].startswith("text/csv")
        assert re.fullmatch(
            r'attachment; filename="pathsg_schools_\d{8}\.csv"',
            response.headers["content-disposition"],
        )

    def test_has_every_column_of_the_schools_table_and_the_list_columns(self, admin):
        add_schools()
        header = next(csv.reader(io.StringIO(export(admin).text)))
        table_columns = {c.name for c in SchoolInfo.__table__.columns} - {"id"}
        assert table_columns <= set(header)
        assert header[-4:] == ["subjects", "ccas", "moe_programmes", "bus_numbers"]

    def test_has_one_row_per_school_by_name(self, admin):
        add_schools()
        schools = rows(export(admin))
        assert [s["school_name"] for s in schools] == [
            "ALPHA PRIMARY SCHOOL",
            "BETA SECONDARY",
        ]

    def test_writes_the_details_of_a_school(self, admin):
        add_schools()
        alpha = rows(export(admin))[0]
        assert alpha["school_key"] == "alpha primary"
        assert alpha["address"] == "1 Alpha Road"
        assert alpha["postal_code"] == "012345"  # the leading zero is kept
        assert (alpha["latitude"], alpha["longitude"]) == ("1.3", "103.8")
        assert (alpha["rank_2017"], alpha["places_taken_phase2b"]) == ("5", "120")
        assert alpha["principal_name"] == "MR TAN"

    def test_lists_the_subjects_ccas_programmes_and_buses(self, admin):
        add_schools()
        alpha = rows(export(admin))[0]
        assert alpha["subjects"] == "Art; Mathematics"
        assert alpha["ccas"] == (
            "AIKIDO | PRIMARY | PHYSICAL SPORTS | MARTIAL ARTS; CHESS | PRIMARY | CLUBS | "
        )
        assert alpha["moe_programmes"] == "LEARNING SUPPORT"
        assert alpha["bus_numbers"] == "964; 965"

    def test_leaves_missing_values_empty(self, admin):
        add_schools()
        beta = rows(export(admin))[1]
        assert beta["address"] == beta["rank_2017"] == beta["subjects"] == ""
        assert beta["ccas"] == beta["moe_programmes"] == beta["bus_numbers"] == ""

    def test_excludes_users_reviews_and_bookmarks(self, admin):
        add_schools()
        school = SchoolInfo.get_by_key(school_key="alpha primary")
        review = client.post(
            f"/review/school/{school.id}",
            json={"text": "Lovely canteen"},
            headers=headers(admin),
        )
        assert review.status_code == status.HTTP_200_OK
        client.put(f"/bookmark/{school.id}", headers=headers(admin))

        response = export(admin)
        header = next(csv.reader(io.StringIO(response.text)))
        assert not {"username", "password", "role", "user_id", "text"} & set(header)
        assert "alice" not in response.text
        assert "Lovely canteen" not in response.text

    def test_the_file_name_is_the_singapore_date(self):
        just_before_midnight_in_utc = datetime(2026, 10, 24, 17, 0, tzinfo=timezone.utc)
        assert (
            SchoolDatasetExporter.filename(just_before_midnight_in_utc)
            == "pathsg_schools_20261025.csv"
        )


class TestExportFailure:
    def test_an_empty_database(self, admin):
        response = export(admin)
        assert error(response, DatasetExportError) == DatasetExportError.EXPORT_FAILED

    def test_an_unreachable_database(self, admin, monkeypatch):
        add_schools()

        def fail():
            raise OperationalError("SELECT", {}, Exception("unable to open database"))

        monkeypatch.setattr(SchoolInfo, "all_with_details", fail)
        response = export(admin)
        assert error(response, DatasetExportError) == DatasetExportError.EXPORT_FAILED
        assert response.json()["detail"] == (
            "Export Failed: Unable to retrieve school data at this time."
        )
