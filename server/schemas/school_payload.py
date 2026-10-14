from pydantic import BaseModel, ConfigDict


class SchoolInfoSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    school_key: str
    school_name: str
    address: str | None = None
    postal_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    zone: str | None = None
    mainlevel_code: str | None = None
    school_type: str | None = None
    gendermix: str | None = None
    psle_2017_cutoff: int | None = None
    rank_2017: int | None = None


class SchoolInfoDetail(SchoolInfoSummary):
    url_address: str | None = None
    telephone_no: str | None = None
    email_address: str | None = None
    mrt_desc: str | None = None
    bus_desc: str | None = None
    principal_name: str | None = None
    sap_ind: str | None = None
    autonomous_ind: str | None = None
    gifted_ind: str | None = None
    ip_ind: str | None = None
    ib: str | None = None
    alp_domain: str | None = None
    alp_title: str | None = None
    llp_domain1: str | None = None
    llp_title: str | None = None
    moe_programmes: list[str] = []
    cca_list: list[str] = []
    cca_count: int | None = None
    subjects_list: list[str] = []
    subjects_count: int | None = None
    places_taken_phase2b: int | None = None
    olevel_track: int | None = None
