from fastapi import APIRouter, Query

from models.school_record import SchoolInfo
from schemas.school_payload import SchoolInfoDetail, SchoolInfoSummary

router = APIRouter(prefix="/school-api", tags=["school-api"])


@router.get("", response_model=list[SchoolInfoSummary])
def list_schools(
    q: str | None = Query(None, description="Name contains"),
    zone: str | None = None,
    level: str | None = Query(None, description="e.g. PRIMARY, SECONDARY"),
    gendermix: str | None = None,
    limit: int = Query(50, le=400),
    offset: int = 0,
):
    return SchoolInfo.search(q, zone, level, gendermix, limit, offset)


@router.get("/{school_key}", response_model=SchoolInfoDetail)
def get_school(school_key: str):
    return SchoolInfo.get_or_404(school_key)
