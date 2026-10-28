"""Cleaning of the raw MOE school CSV files.

This is the notebook (SC2006_EDA.ipynb) turned into a normal module. It takes the
raw CSV files and returns plain Python lists/dicts, ready to be put in the database.
It never touches the database itself.
"""

import io
import re
from dataclasses import dataclass, field

import pandas as pd


class SchoolDataError(ValueError):
    """The uploaded files cannot be turned into a valid dataset."""


# Columns that must exist (after lower-casing the headers and the renames below).
REQUIRED_COLUMNS = {
    "secondary": [
        "school_name",
        "type",
        "area",
        "zone",
        "latitude",
        "longitude",
        "gendermix",
        "rank2017",
        "ib",
        "o-level track",
        "psle2017 cut off",
    ],
    "primary": [
        "school_name",
        "type",
        "area",
        "zone",
        "latitude",
        "longitude",
        "gendermix",
        "placestakenuptillphase2b",
    ],
    "ccas": [
        "school_name",
        "school_section",
        "cca_grouping_desc",
        "cca_generic_name",
        "cca_customized_name",
    ],
    "general": ["school_name", "postal_code", "bus_desc", "mainlevel_code"],
    "moe": ["school_name", "moe_programme_desc"],
    "sdp": ["school_name"],
    "subjects": ["school_name", "subject_desc"],
    "programmes": [
        "school_name",
        "programme",
        "field",
        "fee_sc",
        "fee_pr",
        "fee_intl",
        "misc_fee",
    ],
    "financial_aid": ["school_name", "aid_name", "aid_note"],
    "scholarships": ["school_name", "scholarship_name", "source", "eligibility"],
}

FILE_KEYS = tuple(REQUIRED_COLUMNS)

# Each file kind is recognised by a header only it has (so file names do not matter).
SIGNATURE_COLUMNS = {
    "secondary": {"psle2017 cut off"},
    "primary": {"placestakenuptillphase2b"},
    "ccas": {"cca_grouping_desc"},
    "general": {"bus_desc", "mrt_desc"},
    "moe": {"moe_programme_desc"},
    "sdp": {"alp_domain"},
    "subjects": {"subject_desc"},
    "programmes": {"fee_sc"},
    "financial_aid": {"aid_name"},
    "scholarships": {"scholarship_name"},
}

# Names in the extra files that differ from the general-information file.
KEY_FIXES = {
    "catholic high primary": "catholic high",
    "chij st nicholas girls primary": "chij st nicholas girls",
    "maris stella high primary": "maris stella high",
    "st stephen s primary": "st stephen s",
    "canossa convent primary": "canossa catholic primary",
}
FIXED_FILES = {"sdp", "primary", "secondary"}  # the files KEY_FIXES applies to

INT_COLUMNS = ["rank_2017", "psle_2017_cutoff", "olevel_track", "places_taken_phase2b"]
FLOAT_COLUMNS = ["latitude", "longitude"]

# Spelling variants found in the data -> one spelling, so filters match every school.
GENDERMIX = {"co-ed": "Mixed", "mixed": "Mixed", "girls": "Girls", "boys": "Boys"}
SCHOOL_TYPE = {
    "government": "Government",
    "government-aided": "Government-Aided",
    "government-aided, sap": "Government-Aided",  # the SAP flag is in sap_ind
    "independent": "Independent",
    "specialised": "Specialised",
    "specialised independent schools": "Specialised Independent",
}


@dataclass
class CleanDataset:
    schools: list[dict]
    subjects: list[dict] = field(default_factory=list)  # {school_key, name}
    ccas: list[dict] = field(
        default_factory=list
    )  # {school_key, section, grouping, generic_name, customised_name}
    moe_programmes: list[dict] = field(default_factory=list)  # {school_key, name}
    buses: list[dict] = field(default_factory=list)  # {school_key, bus_no}
    programmes: list[dict] = field(
        default_factory=list
    )  # {school_key, name, field, fee_*, misc_fee}
    financial_aid: list[dict] = field(default_factory=list)  # {school_key, name, note}
    scholarships: list[dict] = field(
        default_factory=list
    )  # {school_key, name, source, eligibility}
    warnings: list[str] = field(default_factory=list)


# ---------------------------------------------------------------- reading files


def identify_frame(df: pd.DataFrame) -> str | None:
    """Which of the raw files this is, judged by its column headers. None if unknown."""
    headers = set(df.columns.astype(str).str.strip().str.lower())
    for key, signature in SIGNATURE_COLUMNS.items():
        if signature <= headers:
            return key
    return None


def read_csv_bytes(data: bytes, label: str) -> pd.DataFrame:
    try:
        try:
            return pd.read_csv(io.BytesIO(data))
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(data), encoding="cp1252")
    except Exception as error:  # noqa: BLE001 - empty file, not a CSV, ...
        raise SchoolDataError(f"Could not read the '{label}' file as a CSV: {error}")


# ---------------------------------------------------------------- small helpers


def clean_name(value) -> str | None:
    """Same as the notebook: the key used to match a school across all files."""
    if value is None or pd.isna(value):
        return None
    s = str(value).lower().strip()
    s = s.replace("&", " and ")
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\bschool\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tidy(value):
    """Strip spaces; empty / 'na' become None; other types are left alone."""
    if isinstance(value, str):
        value = value.strip()
        return None if value == "" or value.lower() == "na" else value
    if value is None or pd.isna(value):
        return None
    return value


def tidy_frame(df: pd.DataFrame) -> pd.DataFrame:
    return df.astype(object).apply(lambda col: col.map(tidy))


def parse_buses(text) -> list[str]:
    if text is None or pd.isna(text):
        return []
    out = []
    for part in re.split(r"[;,]", str(text)):
        part = part.split(" - ")[-1]
        part = re.sub(r"\(.*?\)", "", part).strip().upper()
        if re.fullmatch(r"[A-Z]{0,3}\d{1,3}[A-Z]?", part):
            out.append(part)
    return sorted(set(out))


def canonical_case(series: pd.Series) -> pd.Series:
    """'PHYSICS' and 'Physics' become whichever spelling is used most often."""
    counts = series.dropna().value_counts()
    ranked = sorted(
        counts.items(), key=lambda kv: (-kv[1], kv[0] == kv[0].upper(), kv[0])
    )
    best: dict[str, str] = {}
    for value, _ in ranked:
        best.setdefault(value.lower(), value)
    return series.map(lambda v: best.get(v.lower(), v) if isinstance(v, str) else v)


def _title(value):
    return value.title() if isinstance(value, str) else value


def _map_lower(mapping: dict):
    return lambda v: mapping.get(v.lower(), v) if isinstance(v, str) else v


def _to_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


# ---------------------------------------------------------------- main function


def clean_schools(raw: dict[str, pd.DataFrame]) -> CleanDataset:
    """raw: {'general': DataFrame, 'ccas': DataFrame, ...} for every key in FILE_KEYS."""
    missing = [k for k in FILE_KEYS if k not in raw]
    if missing:
        raise SchoolDataError(f"Missing file(s): {', '.join(missing)}")

    dfs = {}
    for key, df in raw.items():
        df = df.copy()
        df.columns = df.columns.str.strip().str.lower()
        df = df.rename(columns={"schname": "school_name", "name": "school_name"})
        absent = [c for c in REQUIRED_COLUMNS[key] if c not in df.columns]
        if absent:
            raise SchoolDataError(
                f"The '{key}' file is missing column(s): {', '.join(absent)}"
            )
        df["school_key"] = df["school_name"].apply(clean_name)
        if key in FIXED_FILES:
            df["school_key"] = df["school_key"].replace(KEY_FIXES)
        dfs[key] = tidy_frame(df).dropna(subset=["school_key"])

    warnings = []
    general = dfs["general"]
    if general["school_key"].duplicated().any():
        warnings.append(
            f"{int(general['school_key'].duplicated().sum())} duplicate school(s) in the "
            "general information file were ignored."
        )
        general = general.drop_duplicates("school_key")
    if general.empty:
        raise SchoolDataError("The general information file has no schools.")
    master = set(general["school_key"])
    # The general file may carry coordinates (the institutions do). They only fill the gaps:
    # the primary and secondary files win wherever they place the school.
    fallback = general.reindex(columns=["school_key", *FLOAT_COLUMNS])
    fallback = fallback.set_index("school_key")
    general = general.drop(columns=FLOAT_COLUMNS, errors="ignore")

    for key, df in dfs.items():
        if key == "general":
            continue
        unmatched = sorted(set(df["school_key"]) - master)
        if unmatched:
            warnings.append(
                f"'{key}': {len(unmatched)} name(s) match no school and were skipped "
                f"(e.g. {', '.join(unmatched[:5])})."
            )

    # --- extra info per school: the secondary file wins, the primary file fills gaps
    sec = dfs["secondary"].rename(
        columns={
            "type": "school_type",
            "rank2017": "rank_2017",
            "o-level track": "olevel_track",
            "psle2017 cut off": "psle_2017_cutoff",
        }
    )
    sec = sec[
        [
            "school_key",
            "school_type",
            "area",
            "zone",
            "latitude",
            "longitude",
            "gendermix",
            "rank_2017",
            "ib",
            "olevel_track",
            "psle_2017_cutoff",
        ]
    ]
    pri = dfs["primary"].rename(
        columns={
            "type": "school_type",
            "placestakenuptillphase2b": "places_taken_phase2b",
        }
    )
    pri = pri[
        [
            "school_key",
            "school_type",
            "area",
            "zone",
            "latitude",
            "longitude",
            "gendermix",
            "places_taken_phase2b",
        ]
    ]
    extra = (
        sec.drop_duplicates("school_key")
        .set_index("school_key")
        .combine_first(pri.drop_duplicates("school_key").set_index("school_key"))
        .reset_index()
    )

    sdp = dfs["sdp"].drop(columns="school_name").drop_duplicates("school_key")

    merged = general.merge(sdp, on="school_key", how="left").merge(
        extra, on="school_key", how="left"
    )
    if len(merged) != len(general):
        raise SchoolDataError(
            "Merging the files duplicated some schools; check for repeated names."
        )

    # --- tidy values so every filter works
    merged = tidy_frame(merged)
    for col in FLOAT_COLUMNS:
        from_general = merged["school_key"].map(fallback[col])
        merged[col] = merged[col].where(merged[col].notna(), from_general)
    merged["postal_code"] = merged["postal_code"].map(
        lambda v: None if v is None else re.sub(r"\.0$", "", str(v)).zfill(6)
    )
    for col in ("zone", "area"):
        merged[col] = merged[col].map(_title)
    for col in ("alp_domain", "llp_domain1"):
        merged[col] = canonical_case(merged[col])
    merged["gendermix"] = merged["gendermix"].map(_map_lower(GENDERMIX))
    merged["school_type"] = merged["school_type"].map(_map_lower(SCHOOL_TYPE))
    for col in INT_COLUMNS:
        merged[col] = _to_number(merged[col]).round().astype("Int64").astype(object)
    for col in FLOAT_COLUMNS:
        merged[col] = _to_number(merged[col]).astype(object)
    merged = merged.sort_values("school_name").reset_index(drop=True)
    merged = merged.astype(object).where(merged.notna(), None)

    # --- one-to-many tables (only for schools that exist in the general file)
    def keep(df):
        return df[df["school_key"].isin(master)]

    subjects = keep(dfs["subjects"])[["school_key", "subject_desc"]].dropna().copy()
    subjects["subject_desc"] = canonical_case(subjects["subject_desc"])
    subjects = subjects.drop_duplicates().rename(columns={"subject_desc": "name"})
    moe = keep(dfs["moe"])[["school_key", "moe_programme_desc"]].dropna().copy()
    moe["moe_programme_desc"] = canonical_case(moe["moe_programme_desc"])
    moe = moe.drop_duplicates().rename(columns={"moe_programme_desc": "name"})
    cca_rows = keep(dfs["ccas"]).copy()
    for col in ("cca_grouping_desc", "cca_generic_name"):
        cca_rows[col] = canonical_case(cca_rows[col])
    ccas = (
        cca_rows[
            [
                "school_key",
                "school_section",
                "cca_grouping_desc",
                "cca_generic_name",
                "cca_customized_name",
            ]
        ]
        .dropna(subset=["cca_grouping_desc"])
        .drop_duplicates()
        .rename(
            columns={
                "school_section": "section",
                "cca_grouping_desc": "grouping",
                "cca_generic_name": "generic_name",
                "cca_customized_name": "customised_name",
            }
        )
    )
    ccas = ccas.astype(object).where(ccas.notna(), None)
    buses = [
        {"school_key": k, "bus_no": b}
        for k, text in zip(merged["school_key"], merged["bus_desc"])
        for b in parse_buses(text)
    ]

    # --- programmes with their fees, financial aid and scholarships (one row per entry)
    programmes = keep(dfs["programmes"])[
        ["school_key", "programme", "field", "fee_sc", "fee_pr", "fee_intl", "misc_fee"]
    ].copy()
    for col in ("fee_sc", "fee_pr", "fee_intl", "misc_fee"):
        programmes[col] = _to_number(programmes[col])
    programmes = (
        programmes.dropna(subset=["programme"])
        .drop_duplicates()
        .rename(columns={"programme": "name"})
    )
    programmes = programmes.astype(object).where(programmes.notna(), None)
    aid = keep(dfs["financial_aid"])[["school_key", "aid_name", "aid_note"]]
    aid = aid.dropna(subset=["aid_name"]).drop_duplicates()
    aid = aid.rename(columns={"aid_name": "name", "aid_note": "note"})
    aid = aid.astype(object).where(aid.notna(), None)
    scholarships = keep(dfs["scholarships"])[
        ["school_key", "scholarship_name", "source", "eligibility"]
    ]
    scholarships = scholarships.dropna(subset=["scholarship_name"]).drop_duplicates()
    scholarships = scholarships.rename(columns={"scholarship_name": "name"})
    scholarships = scholarships.astype(object).where(scholarships.notna(), None)

    return CleanDataset(
        schools=merged.to_dict("records"),
        subjects=subjects.to_dict("records"),
        ccas=ccas.to_dict("records"),
        moe_programmes=moe.to_dict("records"),
        buses=buses,
        programmes=programmes.to_dict("records"),
        financial_aid=aid.to_dict("records"),
        scholarships=scholarships.to_dict("records"),
        warnings=warnings,
    )
