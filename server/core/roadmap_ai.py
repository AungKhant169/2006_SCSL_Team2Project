from fastapi import status

from core.exceptions import HttpError
from models.user import User
from schemas.roadmap import AIRoadmapRequest


class RoadmapAIError(HttpError):
    AI_UNAVAILABLE = (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Unable to generate AI recommendation at this time. Please try again.",
    )
    AI_TIMEOUT = (
        status.HTTP_504_GATEWAY_TIMEOUT,
        "The AI recommendation took too long to generate. Please try again.",
    )


class AIRoadmapGenerator:
    @classmethod
    def generate(cls, user: User, request: AIRoadmapRequest) -> list[int]:
        """Return school ids in preference order for the requested stage."""


""" file to add openai roadmap generation"""
