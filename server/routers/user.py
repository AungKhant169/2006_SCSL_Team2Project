from fastapi import APIRouter, status

from core.authenticator import Requester
from models.user import User
from schemas.user import Credentials, Identity, TokenRequest, TokenResponse

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/identity", response_model=Identity)
def identity(user: Requester):
    return Identity(id=user.id, username=user.username)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: TokenRequest):
    access_token, refresh_token = User.refresh(data.refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/register", response_model=TokenResponse)
def register(data: Credentials):
    access_token, refresh_token = User.register(data.username, data.password)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
def login(data: Credentials):
    access_token, refresh_token = User.login(data.username, data.password)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: TokenRequest):
    User.logout(data.refresh_token)
