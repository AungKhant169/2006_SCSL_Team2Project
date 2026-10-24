import json
from types import SimpleNamespace

from fastapi import status

from core import roadmap_ai
from core.roadmap_ai import AIRoadmapGenerator, RoadmapAIError
from models.base import SessionLocal
from models.school_record import SchoolInfo, SchoolSubject
from models.user import UserError
from tests.conftest import client

PAYLOAD = {"stage": "secondary", "postal": "556000", "previous_academic_score": 8}


def error(response):
    body = response.status_code, response.json()["detail"]
    return next((e for e in RoadmapAIError if e.args == body), None)


def generate(authenticated, payload=PAYLOAD):
    headers = {"Authorization": f"Bearer {authenticated.tokens['access_token']}"}
    return client.post("/roadmap/generate-ai-roadmap", json=payload, headers=headers)


class TestGenerateAI:
    def test_requires_authentication(self):
        response = client.post("/roadmap/generate-ai-roadmap", json=PAYLOAD)
        body = response.status_code, response.json()["detail"]
        assert UserError.ACCESS_TOKEN_INVALID.args == body

    def test_invalid_stage(self, authenticated):
        response = generate(authenticated, {"stage": "kindergarten"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_success(self, authenticated, monkeypatch):
        first = SchoolInfo.create(school_key="first", school_name="First School")
        second = SchoolInfo.create(school_key="second", school_name="Second School")
        # The school details follow the order of the choices; unknown ids are skipped.
        choices = [second.id, 999, first.id]
        monkeypatch.setattr(
            AIRoadmapGenerator, "generate", lambda user, request: choices
        )
        response = generate(authenticated)
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["choices"] == choices
        assert [school["id"] for school in body["schools"]] == [second.id, first.id]
        assert [school["school_name"] for school in body["schools"]] == [
            "Second School",
            "First School",
        ]

    def test_keeps_only_known_unique_ids_from_the_model(
        self, authenticated, monkeypatch
    ):
        school = SchoolInfo.create(
            school_key="first", school_name="First", mainlevel_code="SECONDARY (S1-S5)"
        )
        reply = json.dumps({"choices": [999, school.id, school.id]})

        class FakeOpenAI:
            def __init__(self, **options):
                completion = SimpleNamespace(
                    choices=[SimpleNamespace(message=SimpleNamespace(content=reply))]
                )
                create = lambda **request: completion
                self.chat = SimpleNamespace(completions=SimpleNamespace(create=create))

        monkeypatch.setenv("OPENAI_API_KEY", "test-key")
        monkeypatch.setattr(roadmap_ai, "OpenAI", FakeOpenAI)
        body = generate(authenticated).json()
        assert body["choices"] == [school.id]
        assert [s["id"] for s in body["schools"]] == [school.id]

    def test_without_an_api_key_openai_is_not_called(self, authenticated, monkeypatch):
        SchoolInfo.create(
            school_key="first", school_name="First", mainlevel_code="SECONDARY (S1-S5)"
        )

        class NeverCalled:
            def __init__(self, **options):
                raise AssertionError("OpenAI must not be called without a key")

        # docker compose passes an empty key through when none is configured.
        monkeypatch.setenv("OPENAI_API_KEY", "")
        monkeypatch.setattr(roadmap_ai, "OpenAI", NeverCalled)
        assert error(generate(authenticated)) == RoadmapAIError.AI_UNAVAILABLE

    def test_ai_unavailable(self, authenticated, monkeypatch):
        def fail(user, request):
            raise RoadmapAIError.AI_UNAVAILABLE

        monkeypatch.setattr(AIRoadmapGenerator, "generate", fail)
        assert error(generate(authenticated)) == RoadmapAIError.AI_UNAVAILABLE

    def test_ai_timeout(self, authenticated, monkeypatch):
        def fail(user, request):
            raise RoadmapAIError.AI_TIMEOUT

        monkeypatch.setattr(AIRoadmapGenerator, "generate", fail)
        assert error(generate(authenticated)) == RoadmapAIError.AI_TIMEOUT


def headers(auth):
    return {"Authorization": f"Bearer {auth.tokens['access_token']}"}


class TestGenerateRule:
    def test_returns_choices_with_school_details(self, authenticated):
        for n in range(4):
            SchoolInfo.create(
                school_key=f"s{n}", school_name=f"School {n}", mainlevel_code="PRIMARY"
            )
        response = client.post(
            "/roadmap/generate-rule-roadmap",
            json={"stage": "primary", "postal": "556000"},
            headers=headers(authenticated),
        )
        body = response.json()
        assert len(body["choices"]) == 3
        assert [school["id"] for school in body["schools"]] == body["choices"]

    def test_stage_without_schools_gives_an_empty_plan(self, authenticated):
        response = client.post(
            "/roadmap/generate-rule-roadmap",
            json={"stage": "uni"},
            headers=headers(authenticated),
        )
        assert response.json() == {"choices": [], "schools": []}

    def test_post_secondary_prefers_schools_with_more_subjects(self, authenticated):
        few = SchoolInfo.create(
            school_key="few", school_name="Few JC", mainlevel_code="JUNIOR COLLEGE"
        )
        many = SchoolInfo.create(
            school_key="many", school_name="Many JC", mainlevel_code="JUNIOR COLLEGE"
        )
        with SessionLocal() as session:
            session.add(SchoolSubject(school_id=few.id, name="Art"))
            session.add_all(
                SchoolSubject(school_id=many.id, name=name) for name in ("Art", "Music")
            )
            session.commit()
        response = client.post(
            "/roadmap/generate-rule-roadmap",
            json={"stage": "postsec"},
            headers=headers(authenticated),
        )
        assert response.json()["choices"] == [many.id, few.id]

    def test_secondary_prefers_the_nearest_school_for_a_top_score(self, authenticated):
        # Postal sector 55 is the Hougang district (north-east); sector 60 is Jurong (west).
        near = SchoolInfo.create(
            school_key="near",
            school_name="Near",
            mainlevel_code="SECONDARY (S1-S5)",
            latitude=1.37,
            longitude=103.89,
            psle_2017_cutoff=200,
        )
        far = SchoolInfo.create(
            school_key="far",
            school_name="Far",
            mainlevel_code="SECONDARY (S1-S5)",
            latitude=1.33,
            longitude=103.74,
            psle_2017_cutoff=200,
        )
        response = client.post(
            "/roadmap/generate-rule-roadmap",
            json={
                "stage": "secondary",
                "postal": "556000",
                "previous_academic_score": 4,
            },
            headers=headers(authenticated),
        )
        assert response.json()["choices"] == [near.id, far.id]


class TestSavedRoadmap:
    def test_none_saved(self, authenticated):
        response = client.get("/roadmap", headers=headers(authenticated))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_save_replaces_and_returns_school_details(self, authenticated):
        first = SchoolInfo.create(school_key="first", school_name="First")
        second = SchoolInfo.create(school_key="second", school_name="Second")
        for choices in ([first.id], [second.id, first.id]):
            response = client.put(
                "/roadmap",
                json={
                    "stage": "primary",
                    "source": "Rule-Based Plan",
                    "choices": choices,
                },
                headers=headers(authenticated),
            )
        body = response.json()
        assert body["choices"] == [second.id, first.id]
        assert [school["school_name"] for school in body["schools"]] == [
            "Second",
            "First",
        ]
        assert client.get("/roadmap", headers=headers(authenticated)).json() == body

    def test_edit_changes_only_the_choices(self, authenticated):
        first = SchoolInfo.create(school_key="first", school_name="First")
        second = SchoolInfo.create(school_key="second", school_name="Second")
        client.put(
            "/roadmap",
            json={
                "stage": "primary",
                "source": "AI-Generated Plan",
                "choices": [first.id],
            },
            headers=headers(authenticated),
        )
        response = client.patch(
            "/roadmap", json={"choices": [second.id]}, headers=headers(authenticated)
        )
        body = response.json()
        assert (body["stage"], body["source"]) == ("primary", "AI-Generated Plan")
        assert body["choices"] == [second.id]

    def test_choices_are_limited_to_three(self, authenticated):
        response = client.put(
            "/roadmap",
            json={
                "stage": "primary",
                "source": "Rule-Based Plan",
                "choices": [1, 2, 3, 4],
            },
            headers=headers(authenticated),
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    def test_a_deleted_school_is_left_out_of_the_details(self, authenticated):
        school = SchoolInfo.create(school_key="first", school_name="First")
        response = client.put(
            "/roadmap",
            json={
                "stage": "primary",
                "source": "Rule-Based Plan",
                "choices": [school.id, 999],
            },
            headers=headers(authenticated),
        )
        body = response.json()
        assert body["choices"] == [school.id, 999]
        assert [s["id"] for s in body["schools"]] == [school.id]

    def test_delete_is_idempotent(self, authenticated):
        for _ in range(2):
            response = client.delete("/roadmap", headers=headers(authenticated))
            assert response.status_code == status.HTTP_204_NO_CONTENT
