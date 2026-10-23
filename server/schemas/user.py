from pydantic import BaseModel

from models.user import Role


class Credentials(BaseModel):
    username: str
    password: str


class Identity(BaseModel):
    id: int
    username: str
    role: Role


class TokenRequest(BaseModel):
    access_token: str
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
