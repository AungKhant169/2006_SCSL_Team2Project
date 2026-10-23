from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


class ReviewRequest(BaseModel):
    text: str


class ReviewResponse(BaseModel):
    id: int
    school_id: int
    username: str
    text: str
    created_at: datetime
    updated_at: datetime | None = None

    @field_serializer("created_at", "updated_at")
    def serialize_timestamp(self, value: datetime | None) -> str | None:
        # Stored as naive UTC; mark it so clients convert to their local time.
        return None if value is None else value.replace(tzinfo=timezone.utc).isoformat()