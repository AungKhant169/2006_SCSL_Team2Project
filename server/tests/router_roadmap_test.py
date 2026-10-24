from fastapi import status

from core.roadmap_ai import AIRoadmapGenerator, RoadmapAIError
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
