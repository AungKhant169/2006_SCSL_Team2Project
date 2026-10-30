from fastapi import status

from models.base import SessionLocal
from models.school_record import (
    SchoolAid,
    SchoolInfo,
    SchoolInfoError,
    SchoolProgramme,
    SchoolScholarship,
)
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

    def test_stage_includes_integrated_and_mixed_level_schools(self):
        make_school("a", "Alpha Primary", mainlevel_code="PRIMARY")
        make_school("b", "Beta Secondary", mainlevel_code="SECONDARY (S1-S5)")
        make_school("c", "Gamma Integrated", mainlevel_code="MIXED LEVEL (S1-JC2)")
        make_school("d", "Delta College", mainlevel_code="JUNIOR COLLEGE")
        make_school("e", "Epsilon All-through", mainlevel_code="MIXED LEVEL (P1-S4)")

        def keys(stage):
            body = client.get("/school-api", params={"stage": stage}).json()
            return [item["school_key"] for item in body["items"]]

        assert keys("primary") == ["a", "e"]
        assert keys("secondary") == ["b", "e", "c"]
        assert keys("postsec") == ["d", "c"]
        assert keys("preschool") == []
        assert keys("uni") == []

    def test_items_list_the_stages_of_the_school(self):
        make_school("c", "Gamma Integrated", mainlevel_code="MIXED LEVEL (S1-JC2)")
        item = client.get("/school-api").json()["items"][0]
        assert item["stages"] == ["secondary", "postsec"]

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

    def test_lists_the_programmes_with_their_fees_aid_and_scholarships(self):
        school = make_school()
        with SessionLocal() as db:
            db.add_all(
                [
                    SchoolProgramme(
                        school_id=school.id,
                        name="DIPLOMA IN ENGINEERING",
                        field="Engineering",
                        fee_sc=3100,
                        fee_pr=6400,
                        fee_intl=12400,
                        misc_fee=300,
                    ),
                    SchoolAid(
                        school_id=school.id, name="MOE FAS", note="100% fee subsidy"
                    ),
                    SchoolScholarship(
                        school_id=school.id,
                        name="Gold",
                        source="School",
                        eligibility="Top students",
                    ),
                ]
            )
            db.commit()
        body = client.get("/school-api/first").json()
        assert body["programmes"] == [
            {
                "name": "DIPLOMA IN ENGINEERING",
                "field": "Engineering",
                "fee_sc": 3100.0,
                "fee_pr": 6400.0,
                "fee_intl": 12400.0,
                "misc_fee": 300.0,
            }
        ]
        assert body["financial_aid"] == [
            {"name": "MOE FAS", "note": "100% fee subsidy"}
        ]
        assert body["scholarships"] == [
            {"name": "Gold", "source": "School", "eligibility": "Top students"}
        ]

    def test_unknown_key(self):
        response = client.get("/school-api/missing")
        assert (response.status_code, response.json()["detail"]) == (
            SchoolInfoError.SCHOOL_NOT_FOUND.value
        )


class TestOptions:
    def test_lists_the_values_a_filter_accepts(self):
        make_school("a", "A", school_type="Government")
        make_school("b", "B", school_type="Independent")
        body = client.get("/school-api/options").json()
        assert body["school_types"] == ["Government", "Independent"]
