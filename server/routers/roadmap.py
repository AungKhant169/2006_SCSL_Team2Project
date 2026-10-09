from fastapi import APIRouter, status

from core.authenticator import Requester
from core.roadmap_ai import AIRoadmapGenerator
from models.roadmap import Roadmap
from schemas.roadmap import (
    AIRoadmapRequest,
    AIRoadmapResponse,
    RoadmapEdit,
    RoadmapResponse,
    RoadmapSave,
)

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


def to_response(roadmap: Roadmap) -> RoadmapResponse:
    return RoadmapResponse(
        stage=roadmap.stage, source=roadmap.source, choices=roadmap.choices
    )


@router.post("/generate-ai-roadmap", response_model=AIRoadmapResponse)
def generate_ai_roadmap(data: AIRoadmapRequest, user: Requester):
    choices = AIRoadmapGenerator.generate(user, data)
    return AIRoadmapResponse(choices=choices)


@router.get("", response_model=RoadmapResponse)
def get_roadmap(user: Requester):
    return to_response(Roadmap.get_for_user(user.id))


@router.put("", response_model=RoadmapResponse)
def save_roadmap(data: RoadmapSave, user: Requester):
    return to_response(Roadmap.save(user.id, data.stage, data.source, data.choices))


@router.patch("", response_model=RoadmapResponse)
def edit_roadmap(data: RoadmapEdit, user: Requester):
    return to_response(Roadmap.edit(user.id, data.choices))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_roadmap(user: Requester):
    Roadmap.remove(user.id)