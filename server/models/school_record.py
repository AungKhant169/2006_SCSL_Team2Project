from fastapi import status
from sqlalchemy import (
    Float,
    ForeignKey,
    Integer,
    String,
    and_,
    false,
    func,
    or_,
    select,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, selectinload

from core.exceptions import HttpError
from models.base import Base, Persistable, SessionLocal


class SchoolInfoError(HttpError):
    SCHOOL_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "This school could not be found.",
    )
    NOT_ADMIN = (
        status.HTTP_403_FORBIDDEN,
        "Only an admin can update the school data.",
    )


# The main levels (mainlevel_code contains) that belong to each education stage. A school that
# spans stages, such as an integrated programme, belongs to every stage it covers.
STAGE_LEVELS = {
    "preschool": (),
    "primary": ("PRIMARY", "MIXED LEVEL (P1"),
    "secondary": ("SECONDARY", "MIXED LEVEL"),
    # "JC2" picks out the mixed-level schools that run up to junior college.
    "postsec": ("POLYTECHNIC", "JUNIOR COLLEGE", "CENTRALISED INSTITUTE", "JC2"),
    "uni": ("UNIVERSITY",),
}


def _eq(column, value: str):
    """Case-insensitive, space-insensitive 'equals'."""
    return func.lower(func.trim(column)) == value.strip().lower()


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
    area: Mapped[str | None] = mapped_column(String(50), index=True)
    zone: Mapped[str | None] = mapped_column(String(50), index=True)

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

    # ranking / admissions
    rank_2017: Mapped[int | None] = mapped_column(Integer)
    psle_2017_cutoff: Mapped[int | None] = mapped_column(Integer)
    olevel_track: Mapped[int | None] = mapped_column(Integer)
    places_taken_phase2b: Mapped[int | None] = mapped_column(Integer)

    # one row per subject / CCA / MOE programme / bus / programme with fees / aid / scholarship
    subjects: Mapped[list["SchoolSubject"]] = relationship(cascade="all, delete-orphan")
    ccas: Mapped[list["SchoolCca"]] = relationship(cascade="all, delete-orphan")
    moe_programme_rows: Mapped[list["SchoolMoeProgramme"]] = relationship(
        cascade="all, delete-orphan"
    )
    bus_rows: Mapped[list["SchoolBus"]] = relationship(cascade="all, delete-orphan")
    programme_rows: Mapped[list["SchoolProgramme"]] = relationship(
        cascade="all, delete-orphan"
    )
    aid_rows: Mapped[list["SchoolAid"]] = relationship(cascade="all, delete-orphan")
    scholarship_rows: Mapped[list["SchoolScholarship"]] = relationship(
        cascade="all, delete-orphan"
    )

    @property
    def stages(self) -> list[str]:
        """The education stages the school belongs to, from its main level."""
        level = (self.mainlevel_code or "").upper()
        return [
            stage
            for stage, levels in STAGE_LEVELS.items()
            if any(part in level for part in levels)
        ]

    # Plain lists/counts for the API. Only valid on a school loaded by get_or_404.
    @property
    def subjects_list(self) -> list[str]:
        return sorted(r.name for r in self.subjects)

    @property
    def cca_list(self) -> list[str]:
        return sorted({r.grouping for r in self.ccas})

    @property
    def cca_details(self) -> list["SchoolCca"]:
        return sorted(self.ccas, key=lambda r: (r.grouping, r.section or ""))

    @property
    def moe_programmes(self) -> list[str]:
        return sorted(r.name for r in self.moe_programme_rows)

    @property
    def programmes(self) -> list["SchoolProgramme"]:
        return sorted(self.programme_rows, key=lambda r: r.name)

    @property
    def financial_aid(self) -> list["SchoolAid"]:
        return sorted(self.aid_rows, key=lambda r: r.name)

    @property
    def scholarships(self) -> list["SchoolScholarship"]:
        return sorted(self.scholarship_rows, key=lambda r: r.name)

    @property
    def bus_numbers(self) -> list[str]:
        return sorted(r.bus_no for r in self.bus_rows)

    @property
    def subjects_count(self) -> int:
        return len(self.subjects)

    @property
    def cca_count(self) -> int:
        return len(self.cca_list)

    @property
    def moe_programmes_count(self) -> int:
        return len(self.moe_programme_rows)

    # ------------------------------------------------------------------ queries

    @classmethod
    def search(
        cls,
        q=None,
        area=None,
        zone=None,
        level=None,
        stage=None,
        school_type=None,
        gendermix=None,
        nature=None,
        session=None,
        sap=None,
        autonomous=None,
        gifted=None,
        ip=None,
        ib=None,
        mother_tongue=None,
        alp_domain=None,
        llp_domain=None,
        mrt=None,
        bus=(),
        subject=(),
        cca=(),
        cca_category=None,
        cca_section=None,
        cca_name=None,
        moe_programme=(),
        psle_min=None,
        psle_max=None,
        rank_min=None,
        rank_max=None,
        places_min=None,
        places_max=None,
        limit=50,
        offset=0,
        load_programmes=False,
    ):
        """Every filter given must match. For the repeatable ones (bus, subject, cca,
        moe_programme) the school must have ALL the values listed. With load_programmes
        the subjects and CCAs are loaded too, so subjects_count and cca_count can be read."""
        stmt = select(cls)
        if load_programmes:
            stmt = stmt.options(selectinload(cls.subjects), selectinload(cls.ccas))

        def add(condition):
            nonlocal stmt
            stmt = stmt.where(condition)

        if q:
            add(cls.school_name.ilike(f"%{q.strip()}%"))
        if level:
            add(cls.mainlevel_code.ilike(f"%{level.strip()}%"))
        if stage:
            add(
                or_(
                    false(),
                    *(
                        cls.mainlevel_code.ilike(f"%{part}%")
                        for part in STAGE_LEVELS[stage]
                    ),
                )
            )
        if mrt:
            add(cls.mrt_desc.ilike(f"%{mrt.strip()}%"))
        for column, value in (
            (cls.area, area),
            (cls.zone, zone),
            (cls.school_type, school_type),
            (cls.gendermix, gendermix),
            (cls.nature_code, nature),
            (cls.session_code, session),
            (cls.alp_domain, alp_domain),
            (cls.llp_domain1, llp_domain),
        ):
            if value:
                add(_eq(column, value))
        for column, flag, yes, no in (
            (cls.sap_ind, sap, "Yes", "No"),
            (cls.autonomous_ind, autonomous, "Yes", "No"),
            (cls.gifted_ind, gifted, "Yes", "No"),
            (cls.ip_ind, ip, "Yes", "No"),
            (cls.ib, ib, "Y", "N"),
        ):
            if flag is not None:
                add(_eq(column, yes if flag else no))
        if mother_tongue:
            add(
                or_(
                    *(
                        _eq(c, mother_tongue)
                        for c in (
                            cls.mothertongue1_code,
                            cls.mothertongue2_code,
                            cls.mothertongue3_code,
                        )
                    )
                )
            )
        for column, low, high in (
            (cls.psle_2017_cutoff, psle_min, psle_max),
            (cls.rank_2017, rank_min, rank_max),
            (cls.places_taken_phase2b, places_min, places_max),
        ):
            if low is not None:
                add(column >= low)
            if high is not None:
                add(column <= high)

        for value in subject:
            add(cls.subjects.any(_eq(SchoolSubject.name, value)))
        for value in moe_programme:
            add(cls.moe_programme_rows.any(_eq(SchoolMoeProgramme.name, value)))
        for value in bus:
            add(cls.bus_rows.any(_eq(SchoolBus.bus_no, value)))
        for value in cca:
            add(cls.ccas.any(_eq(SchoolCca.grouping, value)))
        if cca_category or cca_section or cca_name:
            # all of these must hold on the SAME cca row
            conditions = []
            if cca_category:
                conditions.append(_eq(SchoolCca.generic_name, cca_category))
            if cca_section:
                conditions.append(_eq(SchoolCca.section, cca_section))
            if cca_name:
                like = f"%{cca_name.strip()}%"
                conditions.append(
                    or_(
                        SchoolCca.grouping.ilike(like),
                        SchoolCca.customised_name.ilike(like),
                    )
                )
            add(cls.ccas.any(and_(*conditions)))

        with SessionLocal() as db:
            total = db.scalar(select(func.count()).select_from(stmt.subquery()))
            items = list(
                db.scalars(stmt.order_by(cls.school_name).limit(limit).offset(offset))
            )
        return items, total

    @classmethod
    def options(cls) -> dict[str, list[str]]:
        """Every value the filters accept, for the frontend's dropdowns."""

        def distinct(column):
            return list(
                db.scalars(
                    select(column)
                    .where(column.is_not(None))
                    .distinct()
                    .order_by(column)
                )
            )

        with SessionLocal() as db:
            tongues = sorted(
                {
                    v
                    for c in (
                        cls.mothertongue1_code,
                        cls.mothertongue2_code,
                        cls.mothertongue3_code,
                    )
                    for v in distinct(c)
                }
            )
            return {
                "areas": distinct(cls.area),
                "zones": distinct(cls.zone),
                "levels": distinct(cls.mainlevel_code),
                "school_types": distinct(cls.school_type),
                "gendermix": distinct(cls.gendermix),
                "natures": distinct(cls.nature_code),
                "sessions": distinct(cls.session_code),
                "mother_tongues": tongues,
                "alp_domains": distinct(cls.alp_domain),
                "llp_domains": distinct(cls.llp_domain1),
                "subjects": distinct(SchoolSubject.name),
                "cca_groupings": distinct(SchoolCca.grouping),
                "cca_categories": distinct(SchoolCca.generic_name),
                "cca_sections": distinct(SchoolCca.section),
                "moe_programmes": distinct(SchoolMoeProgramme.name),
                "bus_numbers": distinct(SchoolBus.bus_no),
            }

    @classmethod
    def count(cls) -> int:
        with SessionLocal() as db:
            return db.scalar(select(func.count()).select_from(cls)) or 0

    @classmethod
    def all_with_details(cls) -> list["SchoolInfo"]:
        """Every school, by name, with its subjects, CCAs, MOE programmes and buses loaded."""
        stmt = (
            select(cls)
            .order_by(cls.school_name)
            .options(
                selectinload(cls.subjects),
                selectinload(cls.ccas),
                selectinload(cls.moe_programme_rows),
                selectinload(cls.bus_rows),
                selectinload(cls.programme_rows),
                selectinload(cls.aid_rows),
                selectinload(cls.scholarship_rows),
            )
        )
        with SessionLocal() as db:
            return list(db.scalars(stmt))

    @classmethod
    def get_or_404(cls, school_key: str):
        stmt = (
            select(cls)
            .where(cls.school_key == school_key)
            .options(
                selectinload(cls.subjects),
                selectinload(cls.ccas),
                selectinload(cls.moe_programme_rows),
                selectinload(cls.bus_rows),
                selectinload(cls.programme_rows),
                selectinload(cls.aid_rows),
                selectinload(cls.scholarship_rows),
            )
        )
        with SessionLocal() as db:
            if not (school := db.scalars(stmt).first()):
                raise SchoolInfoError.SCHOOL_NOT_FOUND
            return school


class SchoolSubject(Base):
    __tablename__ = "school_subjects"

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), index=True)


class SchoolCca(Base):
    __tablename__ = "school_ccas"

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    grouping: Mapped[str] = mapped_column(String(200), index=True)  # e.g. AIKIDO
    section: Mapped[str | None] = mapped_column(
        String(100), index=True
    )  # school level, e.g. PRIMARY
    generic_name: Mapped[str | None] = mapped_column(
        String(200), index=True
    )  # category, e.g. PHYSICAL SPORTS
    customised_name: Mapped[str | None] = mapped_column(String(200))


class SchoolMoeProgramme(Base):
    __tablename__ = "school_moe_programmes"

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), index=True)


class SchoolBus(Base):
    __tablename__ = "school_buses"

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    bus_no: Mapped[str] = mapped_column(String(10), index=True)


class SchoolProgramme(Base):
    """A programme or course with its fees. Fees are per month for primary and secondary
    schools and per year for the post-secondary and university tiers (the client shows the unit)."""

    __tablename__ = "school_programmes"

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), index=True)
    field: Mapped[str | None] = mapped_column(String(200))
    fee_sc: Mapped[float | None] = mapped_column(Float)  # Singapore citizens
    fee_pr: Mapped[float | None] = mapped_column(Float)  # permanent residents
    fee_intl: Mapped[float | None] = mapped_column(Float)  # international students
    misc_fee: Mapped[float | None] = mapped_column(Float)


class SchoolAid(Base):
    __tablename__ = "school_aid"

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    note: Mapped[str | None] = mapped_column(String(500))


class SchoolScholarship(Base):
    __tablename__ = "school_scholarships"

    school_id: Mapped[int] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    source: Mapped[str | None] = mapped_column(String(200))
    eligibility: Mapped[str | None] = mapped_column(String(500))
