import csv
import io
import logging
from datetime import datetime, timedelta, timezone

from fastapi import status
from sqlalchemy.exc import SQLAlchemyError

from core.exceptions import HttpError
from models.school_record import SchoolInfo

log = logging.getLogger(__name__)

# The date in the file name is the Singapore date, whatever time zone the server runs in.
SINGAPORE = timezone(timedelta(hours=8))

# Between the entries of a list column, and between the parts of one entry (a CCA, programme,
# aid or scholarship).
LIST_SEPARATOR = "; "
PART_SEPARATOR = " | "


class DatasetExportError(HttpError):
    EXPORT_FAILED = (
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Export Failed: Unable to retrieve school data at this time.",
    )


class SchoolDatasetExporter:
    """Writes the stored school records to a single CSV file (UC-5.2).

    One row per school. The columns are those of the schools table (without its internal id),
    then the child tables as list columns: `subjects`, `moe_programmes` and `bus_numbers` hold
    their entries separated by "; ", and each entry of `ccas` is
    "grouping | section | category | customised name". `programmes` (name, field, fee for
    citizens, permanent residents, international students, misc fee), `financial_aid` (name,
    note) and `scholarships` (name, source, eligibility) hold their entries the same way.
    Nothing about users, saved roadmaps or reviews is read (REQ-5.13).
    """

    COLUMNS = tuple(c.name for c in SchoolInfo.__table__.columns if c.name != "id")
    HEADER = (
        *COLUMNS,
        "subjects",
        "ccas",
        "moe_programmes",
        "bus_numbers",
        "programmes",
        "financial_aid",
        "scholarships",
    )

    @classmethod
    def run(cls, now: datetime | None = None) -> tuple[str, str]:
        """Return (file name, CSV text). Fails if the database is unreachable or has no schools."""
        try:
            schools = SchoolInfo.all_with_details()
        except SQLAlchemyError as error:
            log.warning("School export: could not read the database: %s", error)
            raise DatasetExportError.EXPORT_FAILED
        if not schools:
            log.warning("School export: there are no schools to export")
            raise DatasetExportError.EXPORT_FAILED
        return cls.filename(now), cls.to_csv(schools)

    @staticmethod
    def filename(now: datetime | None = None) -> str:
        """pathsg_schools_YYYYMMDD.csv, for `now` (an aware time; the current time by default)."""
        date = (now or datetime.now(timezone.utc)).astimezone(SINGAPORE)
        return f"pathsg_schools_{date:%Y%m%d}.csv"

    @classmethod
    def to_csv(cls, schools: list[SchoolInfo]) -> str:
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(cls.HEADER)
        writer.writerows(cls.row(school) for school in schools)
        return out.getvalue()

    @staticmethod
    def _entry(*parts) -> str:
        """One entry of a list column. A fee is written without a trailing ".0"."""
        return PART_SEPARATOR.join(
            ""
            if part is None
            else f"{part:g}"
            if isinstance(part, float)
            else str(part)
            for part in parts
        )

    @classmethod
    def row(cls, school: SchoolInfo) -> list:
        ccas = (
            cls._entry(c.grouping, c.section, c.generic_name, c.customised_name)
            for c in school.cca_details
        )
        return [
            *(getattr(school, column) for column in cls.COLUMNS),
            LIST_SEPARATOR.join(school.subjects_list),
            LIST_SEPARATOR.join(ccas),
            LIST_SEPARATOR.join(school.moe_programmes),
            LIST_SEPARATOR.join(school.bus_numbers),
            LIST_SEPARATOR.join(
                cls._entry(p.name, p.field, p.fee_sc, p.fee_pr, p.fee_intl, p.misc_fee)
                for p in school.programmes
            ),
            LIST_SEPARATOR.join(
                cls._entry(a.name, a.note) for a in school.financial_aid
            ),
            LIST_SEPARATOR.join(
                cls._entry(s.name, s.source, s.eligibility) for s in school.scholarships
            ),
        ]
