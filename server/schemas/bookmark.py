from schemas.school_payload import SchoolInfoSummary


class BookmarkSchool(SchoolInfoSummary):
    # SchoolInfoSummary has the school's name, address, postal code, zone, level and type.
    id: int
