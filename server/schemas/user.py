from pydantic import BaseModel


class Credentials(BaseModel):
    username: str
    password: str


class Identity(BaseModel):
    id: int
    username: str


class TokenRequest(BaseModel):
    access_token: str
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
