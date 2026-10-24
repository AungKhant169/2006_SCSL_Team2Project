from fastapi import APIRouter

from core.authenticator import Requester
from models.profile import Profile
from schemas.profile import ProfileResponse, ProfileSave

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(user: Requester):
    return Profile.for_user(user.id)


@router.put("", response_model=ProfileResponse)
def save_profile(data: ProfileSave, user: Requester):
    return Profile.save(user.id, **data.model_dump())
