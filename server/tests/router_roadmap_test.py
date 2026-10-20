from fastapi import status

from core.roadmap_ai import AIRoadmapGenerator, RoadmapAIError
from models.school_record import SchoolInfo
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
        first = SchoolInfo.create(
            school_key="first-school",
            school_name="First School",
            address="1 School Road",
            postal_code="012345",
            mrt_desc="First MRT",
            bus_desc="Bus 1",
        )
        second = SchoolInfo.create(
            school_key="second-school", school_name="Second School"
        )
        choices = [second.id, first.id]
        monkeypatch.setattr(
            AIRoadmapGenerator, "generate", lambda user, request: choices
        )
        response = generate(authenticated)
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert set(body) == {"choices", "schools"}
        assert body["choices"] == choices
        assert [school["id"] for school in body["schools"]] == choices
        assert [school["school_name"] for school in body["schools"]] == [
            "Second School",
            "First School",
        ]
        assert body["schools"][1]["school_key"] == "first-school"
        assert body["schools"][1]["address"] == "1 School Road"
        assert body["schools"][1]["postal_code"] == "012345"
        assert body["schools"][1]["mrt_desc"] == "First MRT"
        assert body["schools"][1]["bus_desc"] == "Bus 1"
        assert body["schools"][0]["address"] is None

    def test_missing_school_details_are_skipped(self, authenticated, monkeypatch):
        monkeypatch.setattr(
            AIRoadmapGenerator, "generate", lambda user, request: [6, 5, 8]
        )
        response = generate(authenticated)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"choices": [6, 5, 8], "schools": []}

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
