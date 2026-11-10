"""Ephemeral presenter sessions. Only enabled on the separate demo deployment.

Run one API worker (as for the rest of PathSG). Sessions expire after four hours
and disappear on restart; capability keys never appear in URLs sent to the API.
"""

import secrets
from dataclasses import dataclass, field
from time import monotonic
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from core.rate_limit import RateLimiter, client_ip
from core.settings import settings

TTL = 4 * 60 * 60
MAX_SESSIONS = 32
creation_limiter = RateLimiter(10, 60)


def enabled():
    if not settings.demo_enabled:
        raise HTTPException(404, "Demo mode is disabled on this deployment.")


router = APIRouter(prefix="/demo", tags=["demo"], dependencies=[Depends(enabled)])


@dataclass
class Session:
    step_count: int
    control_key: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    display_key: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    expires: float = field(default_factory=lambda: monotonic() + TTL)
    step: int = 0
    version: int = 0
    paused: bool = False
    spotlight: bool = True
    display_seen: float = 0
    acknowledged_version: int = -1
    display_message: str = "Waiting for the display."

    def snapshot(self):
        return {
            "script_id": "pathsg-v1",
            "step": self.step,
            "step_count": self.step_count,
            "version": self.version,
            "paused": self.paused,
            "spotlight": self.spotlight,
            "display_connected": monotonic() - self.display_seen < 6,
            "acknowledged_version": self.acknowledged_version,
            "display_message": self.display_message,
            "expires_in": max(0, int(self.expires - monotonic())),
        }


sessions: dict[str, Session] = {}


def get_session(session_id: str, authorization: str, *, control: bool = False):
    session = sessions.get(session_id)
    if session is None or session.expires <= monotonic():
        sessions.pop(session_id, None)
        raise HTTPException(
            404, "This demo has ended or expired. Start a new session on the laptop."
        )
    key = authorization.removeprefix("Bearer ")
    controller = secrets.compare_digest(key, session.control_key)
    if not controller and (
        control or not secrets.compare_digest(key, session.display_key)
    ):
        raise HTTPException(
            403, "This pairing link is invalid. Scan the code on the laptop again."
        )
    return session, controller


class CreateSession(BaseModel):
    script_id: Literal["pathsg-v1"]
    step_count: int = Field(ge=1, le=64)


class Command(BaseModel):
    action: Literal[
        "next", "previous", "goto", "pause", "spotlight", "restart", "refocus"
    ]
    version: int = Field(ge=0)
    step: int | None = Field(default=None, ge=0)


class Acknowledgement(BaseModel):
    version: int = Field(ge=0)
    message: str = Field(max_length=240)


Auth = Annotated[str, Header(alias="Authorization")]


@router.post("/sessions", status_code=201)
async def create_session(body: CreateSession, request: Request, response: Response):
    response.headers["Cache-Control"] = "no-store"
    if creation_limiter.exceeded(client_ip(request)):
        raise HTTPException(
            429, "Too many sessions. Wait a minute before trying again."
        )
    for key in list(sessions):
        if sessions[key].expires <= monotonic():
            del sessions[key]
    if len(sessions) >= MAX_SESSIONS:
        raise HTTPException(
            429, "All demo slots are in use. End an unused session first."
        )
    session_id = secrets.token_urlsafe(12)
    session = Session(step_count=body.step_count)
    sessions[session_id] = session
    return {
        "id": session_id,
        "control_key": session.control_key,
        "display_key": session.display_key,
        "state": session.snapshot(),
    }


@router.get("/sessions/{session_id}")
async def read_session(session_id: str, authorization: Auth, response: Response):
    response.headers["Cache-Control"] = "no-store"
    session, controller = get_session(session_id, authorization)
    if not controller:
        session.display_seen = monotonic()
    return session.snapshot()


@router.post("/sessions/{session_id}/command")
async def command(
    session_id: str, body: Command, authorization: Auth, response: Response
):
    response.headers["Cache-Control"] = "no-store"
    session, _ = get_session(session_id, authorization, control=True)
    if session.version != body.version:
        raise HTTPException(409, "Another control changed the step. Try again.")
    if body.action == "goto":
        if body.step is None or body.step >= session.step_count:
            raise HTTPException(422, "Choose a step in this demo.")
        session.step = body.step
    elif body.action == "next":
        session.step = min(session.step_count - 1, session.step + 1)
    elif body.action == "previous":
        session.step = max(0, session.step - 1)
    elif body.action == "pause":
        session.paused = not session.paused
    elif body.action == "spotlight":
        session.spotlight = not session.spotlight
    elif body.action == "restart":
        session.step = 0
        session.paused = False
    session.version += 1
    return session.snapshot()


@router.post("/sessions/{session_id}/ack", status_code=204)
async def acknowledge(session_id: str, body: Acknowledgement, authorization: Auth):
    session, controller = get_session(session_id, authorization)
    if controller:
        raise HTTPException(403, "Only the display can acknowledge a step.")
    if body.version == session.version:
        session.acknowledged_version = body.version
        session.display_message = body.message
        session.display_seen = monotonic()


@router.delete("/sessions/{session_id}", status_code=204)
async def end_session(session_id: str, authorization: Auth):
    get_session(session_id, authorization, control=True)
    del sessions[session_id]
