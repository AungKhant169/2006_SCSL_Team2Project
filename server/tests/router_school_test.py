from fastapi import status

from models.school_record import SchoolInfo, SchoolInfoError
from tests.conftest import client


def make_school(key="first", name="First School", **fields):
    return SchoolInfo.create(school_key=key, school_name=name, **fields)


class TestListSchools:
    def test_items_carry_the_id_and_card_details(self):
        school = make_school(
            mainlevel_code="PRIMARY",
            mrt_desc="Bishan Station",
            bus_desc="52, 53",
            places_taken_phase2b=40,
        )
        response = client.get("/school-api")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["total"] == 1
        item = body["items"][0]
        assert item["id"] == school.id
        assert item["school_key"] == "first"
        assert item["mrt_desc"] == "Bishan Station"
        assert item["bus_desc"] == "52, 53"
        assert item["places_taken_phase2b"] == 40

    def test_filters_by_level(self):
        make_school("a", "Alpha Primary", mainlevel_code="PRIMARY")
        make_school("b", "Beta Secondary", mainlevel_code="SECONDARY (S1-S5)")
        body = client.get("/school-api", params={"level": "SECONDARY"}).json()
        assert [item["school_key"] for item in body["items"]] == ["b"]

    def test_pages_results(self):
        for n in range(3):
            make_school(f"s{n}", f"School {n}")
        body = client.get("/school-api", params={"limit": 2, "offset": 2}).json()
        assert body["total"] == 3
        assert [item["school_key"] for item in body["items"]] == ["s2"]


class TestSchoolDetail:
    def test_returns_the_profile_with_its_id(self):
        school = make_school(principal_name="MS TAN")
        body = client.get("/school-api/first").json()
        assert body["id"] == school.id
        assert body["principal_name"] == "MS TAN"
        assert body["subjects_list"] == []

    def test_unknown_key(self):
        response = client.get("/school-api/missing")
        assert (response.status_code, response.json()["detail"]) == (
            SchoolInfoError.SCHOOL_NOT_FOUND.args
        )


class TestOptions:
    def test_lists_the_values_a_filter_accepts(self):
        make_school("a", "A", school_type="Government")
        make_school("b", "B", school_type="Independent")
        body = client.get("/school-api/options").json()
        assert body["school_types"] == ["Government", "Independent"]
