from fastapi import status
from sqlalchemy import JSON, Float, Integer, String, select
from sqlalchemy.orm import Mapped, mapped_column

from core.exceptions import HttpError
from models.base import Base, Persistable, SessionLocal


class SchoolInfoError(HttpError):
    SCHOOL_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "This school could not be found.",
    )


class SchoolInfo(Base, Persistable):
    __tablename__ = "schools"

    school_key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    school_name: Mapped[str] = mapped_column(String(150), index=True)

    # contact / location
    url_address: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(200))
    postal_code: Mapped[str | None] = mapped_column(
        String(6)
    )  # text keeps leading zeros
    telephone_no: Mapped[str | None] = mapped_column(String(20))
    telephone_no_2: Mapped[str | None] = mapped_column(String(20))
    fax_no: Mapped[str | None] = mapped_column(String(20))
    fax_no_2: Mapped[str | None] = mapped_column(String(20))
    email_address: Mapped[str | None] = mapped_column(String(150))
    mrt_desc: Mapped[str | None] = mapped_column(String(200))
    bus_desc: Mapped[str | None] = mapped_column(String(300))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    area: Mapped[str | None] = mapped_column(String(50))
    zone: Mapped[str | None] = mapped_column(String(50))

    # staff
    principal_name: Mapped[str | None] = mapped_column(String(100))
    first_vp_name: Mapped[str | None] = mapped_column(String(100))
    second_vp_name: Mapped[str | None] = mapped_column(String(100))
    third_vp_name: Mapped[str | None] = mapped_column(String(100))
    fourth_vp_name: Mapped[str | None] = mapped_column(String(100))
    fifth_vp_name: Mapped[str | None] = mapped_column(String(100))
    sixth_vp_name: Mapped[str | None] = mapped_column(String(100))

    # classification
    dgp_code: Mapped[str | None] = mapped_column(String(50))
    zone_code: Mapped[str | None] = mapped_column(String(50))
    type_code: Mapped[str | None] = mapped_column(String(50))
    nature_code: Mapped[str | None] = mapped_column(String(50))
    session_code: Mapped[str | None] = mapped_column(String(50))
    mainlevel_code: Mapped[str | None] = mapped_column(String(50), index=True)
    school_type: Mapped[str | None] = mapped_column(String(50))
    gendermix: Mapped[str | None] = mapped_column(String(50))
    sap_ind: Mapped[str | None] = mapped_column(String(10))
    autonomous_ind: Mapped[str | None] = mapped_column(String(10))
    gifted_ind: Mapped[str | None] = mapped_column(String(10))
    ip_ind: Mapped[str | None] = mapped_column(String(10))
    ib: Mapped[str | None] = mapped_column(String(10))
    mothertongue1_code: Mapped[str | None] = mapped_column(String(50))
    mothertongue2_code: Mapped[str | None] = mapped_column(String(50))
    mothertongue3_code: Mapped[str | None] = mapped_column(String(50))

    # programmes
    alp_domain: Mapped[str | None] = mapped_column(String(100))
    alp_title: Mapped[str | None] = mapped_column(String(200))
    llp_domain1: Mapped[str | None] = mapped_column(String(100))
    llp_title: Mapped[str | None] = mapped_column(String(200))
    moe_programmes: Mapped[list[str]] = mapped_column(JSON, default=list)
    moe_programmes_count: Mapped[int | None] = mapped_column(Integer)

    # lists + counts
    cca_list: Mapped[list[str]] = mapped_column(JSON, default=list)
    cca_count: Mapped[int | None] = mapped_column(Integer)
    subjects_list: Mapped[list[str]] = mapped_column(JSON, default=list)
    subjects_count: Mapped[int | None] = mapped_column(Integer)

    # ranking / admissions
    rank_2017: Mapped[int | None] = mapped_column(Integer)
    psle_2017_cutoff: Mapped[int | None] = mapped_column(Integer)
    olevel_track: Mapped[int | None] = mapped_column(Integer)
    places_taken_phase2b: Mapped[int | None] = mapped_column(Integer)

    @classmethod
    def search(cls, q=None, zone=None, level=None, gendermix=None, limit=50, offset=0):
        stmt = select(cls).order_by(cls.school_name)
        if q:
            stmt = stmt.where(cls.school_name.ilike(f"%{q}%"))
        if zone:
            stmt = stmt.where(cls.zone.ilike(zone))
        if level:
            stmt = stmt.where(cls.mainlevel_code.ilike(f"%{level}%"))
        if gendermix:
            stmt = stmt.where(cls.gendermix.ilike(gendermix))
        with SessionLocal() as session:
            return list(session.scalars(stmt.limit(limit).offset(offset)))

    @classmethod
    def get_or_404(cls, school_key: str):
        if not (school := cls.get_by_key(school_key=school_key)):
            raise SchoolInfoError.SCHOOL_NOT_FOUND
        return school
