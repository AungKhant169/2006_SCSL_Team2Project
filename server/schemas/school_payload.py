from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer

Stage = Literal["preschool", "primary", "secondary", "postsec", "uni"]


class SchoolFilter(BaseModel):
    """Query parameters of GET /school-api. Anything left out is not filtered."""

    q: str | None = Field(None, description="School name contains")
    area: str | None = None
    zone: str | None = None
    level: str | None = Field(
        None, description="Main level contains, e.g. PRIMARY, SECONDARY, JUNIOR"
    )
    stage: Stage | None = Field(
        None,
        description="Schools of an education stage, including integrated and mixed-level schools",
    )
    school_type: str | None = Field(
        None, description="e.g. Government, Government-Aided, Independent"
    )
    gendermix: str | None = Field(None, description="Mixed, Girls or Boys")
    nature: str | None = Field(None, description="nature_code, e.g. CO-ED SCHOOL")
    session: str | None = Field(None, description="session_code, e.g. SINGLE SESSION")
    sap: bool | None = None
    autonomous: bool | None = None
    gifted: bool | None = None
    ip: bool | None = Field(None, description="Integrated Programme")
    ib: bool | None = Field(None, description="IB diploma")
    mother_tongue: str | None = Field(
        None, description="e.g. MALAY (any of the 3 mother tongue columns)"
    )
    alp_domain: str | None = None
    llp_domain: str | None = None
    mrt: str | None = Field(None, description="MRT description contains, e.g. Bishan")
    bus: list[str] = Field([], description="Bus number; repeat to require several")
    subject: list[str] = Field([], description="Subject; repeat to require several")
    cca: list[str] = Field(
        [], description="CCA grouping, e.g. AIKIDO; repeat to require several"
    )
    cca_category: str | None = Field(
        None, description="CCA category, e.g. PHYSICAL SPORTS, UNIFORMED GROUPS"
    )
    cca_section: str | None = Field(
        None, description="School level of the CCA, e.g. PRIMARY, SECONDARY (S1-S5)"
    )
    cca_name: str | None = Field(None, description="CCA name contains, e.g. robotics")
    moe_programme: list[str] = Field(
        [], description="MOE programme; repeat to require several"
    )
    psle_min: int | None = None
    psle_max: int | None = None
    rank_min: int | None = None
    rank_max: int | None = None
    places_min: int | None = None
    places_max: int | None = None
    limit: int = Field(50, ge=1, le=400)
    offset: int = Field(0, ge=0)


class SchoolInfoSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # The id is what bookmarks, reviews and roadmaps refer to; the key addresses the profile page.
    id: int
    school_key: str
    school_name: str
    address: str | None = None
    postal_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    area: str | None = None
    zone: str | None = None
    mrt_desc: str | None = None
    bus_desc: str | None = None
    mainlevel_code: str | None = None
    # The stages the school belongs to; a school with an integrated programme has several.
    stages: list[Stage] = []
    school_type: str | None = None
    gendermix: str | None = None
    psle_2017_cutoff: int | None = None
    rank_2017: int | None = None
    places_taken_phase2b: int | None = None


class CcaDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    grouping: str
    section: str | None = None
    generic_name: str | None = Field(None, description="The CCA category")
    customised_name: str | None = None


class SchoolInfoDetail(SchoolInfoSummary):
    url_address: str | None = None
    telephone_no: str | None = None
    email_address: str | None = None
    principal_name: str | None = None
    nature_code: str | None = None
    session_code: str | None = None
    sap_ind: str | None = None
    autonomous_ind: str | None = None
    gifted_ind: str | None = None
    ip_ind: str | None = None
    ib: str | None = None
    mothertongue1_code: str | None = None
    mothertongue2_code: str | None = None
    mothertongue3_code: str | None = None
    alp_domain: str | None = None
    alp_title: str | None = None
    llp_domain1: str | None = None
    llp_title: str | None = None
    olevel_track: int | None = None
    subjects_list: list[str] = []
    subjects_count: int = 0
    cca_list: list[str] = []
    cca_count: int = 0
    cca_details: list[CcaDetail] = []
    moe_programmes: list[str] = []
    moe_programmes_count: int = 0
    bus_numbers: list[str] = []


class SchoolPage(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[SchoolInfoSummary]


class DatasetStatus(BaseModel):
    records: int = Field(description="Schools in the database")
    last_update: datetime | None = Field(
        None, description="When the data was last loaded; empty if it never was"
    )

    @field_serializer("last_update")
    def serialize_last_update(self, value: datetime | None) -> str | None:
        # Stored as naive UTC; mark it so clients convert to their local time.
        return None if value is None else value.replace(tzinfo=timezone.utc).isoformat()


class SchoolUpdateResult(BaseModel):
    message: str
    schools: int
    added: int
    updated: int
    not_in_files: int
    subjects: int
    ccas: int
    moe_programmes: int
    buses: int
    warnings: list[str]
