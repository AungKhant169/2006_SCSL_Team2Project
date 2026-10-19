from fastapi import APIRouter, status

from core.authenticator import Requester
from core.roadmap_ai import AIRoadmapGenerator
from core.roadmap_rules import RuleRoadmapGenerator
from models.roadmap import Roadmap
from models.school_record import SchoolInfo
from schemas.roadmap import (
    CreateRoadmapRequest,
    CreateRoadmapResponse,
    RoadmapEdit,
    RoadmapResponse,
    RoadmapSave,
    AIRoadmapResponse,
    RoadmapSchool
)

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


def to_response(roadmap: Roadmap) -> RoadmapResponse:
    return RoadmapResponse(
        stage=roadmap.stage, source=roadmap.source, choices=roadmap.choices
    )


@router.post("/generate-ai-roadmap", response_model=AIRoadmapResponse)
def generate_ai_roadmap(data: CreateRoadmapRequest, user: Requester):
    choices = AIRoadmapGenerator.generate(user, data)
    schools = []
    for school_id in choices:
        if school := SchoolInfo.get_by_id(school_id):
            schools.append(RoadmapSchool.model_validate(school))
    return AIRoadmapResponse(choices=choices, schools=schools)


@router.post("/generate-rule-roadmap", response_model=CreateRoadmapResponse)
def generate_rule_roadmap(data: CreateRoadmapRequest, user: Requester):
    return CreateRoadmapResponse(choices=RuleRoadmapGenerator.generate(user, data))


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
