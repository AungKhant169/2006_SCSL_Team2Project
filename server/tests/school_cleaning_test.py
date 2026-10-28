import pandas as pd

from core.school_cleaning import REQUIRED_COLUMNS, clean_schools, identify_frame


def frame(key, rows=()):
    """A raw file of the given kind; `rows` are dicts keyed by column name."""
    if not rows:
        return pd.DataFrame(columns=REQUIRED_COLUMNS[key])
    base = {column: None for column in REQUIRED_COLUMNS[key]}
    return pd.DataFrame([{**base, **row} for row in rows])


def clean(general_rows, secondary_rows=(), **files):
    """Clean a dataset; `files` are rows for the other kinds (programmes=..., ...)."""
    raw = {key: frame(key) for key in REQUIRED_COLUMNS}
    raw["general"] = frame("general", general_rows)
    raw["secondary"] = frame("secondary", secondary_rows)
    raw["sdp"] = pd.DataFrame(
        columns=["school_name", "alp_domain", "alp_title", "llp_domain1", "llp_title"]
    )
    for key, rows in files.items():
        raw[key] = frame(key, rows)
    return clean_schools(raw)


def clean_by_key(general_rows, secondary_rows=()):
    return {s["school_key"]: s for s in clean(general_rows, secondary_rows).schools}


class TestCoordinates:
    def test_general_file_fills_a_school_the_other_files_do_not_place(self):
        schools = clean_by_key(
            [
                {
                    "school_name": "BETA POLYTECHNIC",
                    "postal_code": "100002",
                    "mainlevel_code": "POLYTECHNIC",
                    "latitude": 1.31,
                    "longitude": 103.81,
                }
            ]
        )
        assert (
            schools["beta polytechnic"]["latitude"],
            schools["beta polytechnic"]["longitude"],
        ) == (1.31, 103.81)

    def test_primary_and_secondary_coordinates_win_over_the_general_file(self):
        schools = clean_by_key(
            [
                {
                    "school_name": "ALPHA SECONDARY SCHOOL",
                    "postal_code": "100001",
                    "mainlevel_code": "SECONDARY (S1-S5)",
                    "latitude": 1.30,
                    "longitude": 103.80,
                }
            ],
            secondary_rows=[
                {
                    "school_name": "ALPHA SECONDARY SCHOOL",
                    "type": "Government",
                    "area": "Bishan",
                    "zone": "North",
                    "latitude": 1.35,
                    "longitude": 103.85,
                }
            ],
        )
        assert (
            schools["alpha secondary"]["latitude"],
            schools["alpha secondary"]["longitude"],
        ) == (1.35, 103.85)

    def test_a_school_with_no_coordinates_anywhere_keeps_none(self):
        schools = clean_by_key(
            [
                {
                    "school_name": "GAMMA POLYTECHNIC",
                    "postal_code": "100003",
                    "mainlevel_code": "POLYTECHNIC",
                }
            ]
        )
        assert schools["gamma polytechnic"]["latitude"] is None
        assert schools["gamma polytechnic"]["longitude"] is None

    def test_a_general_file_without_coordinate_columns_still_cleans(self):
        schools = clean_by_key(
            [
                {
                    "school_name": "DELTA SCHOOL",
                    "postal_code": "100004",
                    "mainlevel_code": "PRIMARY",
                }
            ]
        )
        assert schools["delta"]["postal_code"] == "100004"
        assert schools["delta"]["latitude"] is None


GENERAL = [
    {
        "school_name": "ALPHA POLYTECHNIC",
        "postal_code": "100001",
        "mainlevel_code": "POLYTECHNIC",
    }
]


class TestProgrammesAidAndScholarships:
    def test_programme_fees_are_numbers_and_missing_fees_are_none(self):
        dataset = clean(
            GENERAL,
            programmes=[
                {
                    "school_name": "ALPHA POLYTECHNIC",
                    "programme": "DIPLOMA IN ENGINEERING",
                    "field": "Engineering",
                    "fee_sc": "3100",
                    "fee_pr": "6400",
                    "fee_intl": "12400",
                    "misc_fee": "na",
                }
            ],
        )
        assert dataset.programmes == [
            {
                "school_key": "alpha polytechnic",
                "name": "DIPLOMA IN ENGINEERING",
                "field": "Engineering",
                "fee_sc": 3100.0,
                "fee_pr": 6400.0,
                "fee_intl": 12400.0,
                "misc_fee": None,
            }
        ]

    def test_rows_for_unknown_schools_are_skipped_with_a_warning(self):
        dataset = clean(
            GENERAL,
            programmes=[
                {
                    "school_name": "GHOST SCHOOL",
                    "programme": "NOTHING",
                    "fee_sc": "1",
                }
            ],
            financial_aid=[{"school_name": "GHOST SCHOOL", "aid_name": "FAS"}],
        )
        assert dataset.programmes == []
        assert dataset.financial_aid == []
        assert any(
            "'programmes': 1 name(s) match no school" in w for w in dataset.warnings
        )

    def test_aid_and_scholarships_are_kept_per_school(self):
        dataset = clean(
            GENERAL,
            financial_aid=[
                {
                    "school_name": "ALPHA POLYTECHNIC",
                    "aid_name": "MOE Financial Assistance Scheme",
                    "aid_note": "100% fee subsidy",
                }
            ],
            scholarships=[
                {
                    "school_name": "ALPHA POLYTECHNIC",
                    "scholarship_name": "Gold Scholarship",
                    "source": "Alpha Polytechnic",
                    "eligibility": "Top students",
                }
            ],
        )
        assert dataset.financial_aid == [
            {
                "school_key": "alpha polytechnic",
                "name": "MOE Financial Assistance Scheme",
                "note": "100% fee subsidy",
            }
        ]
        assert dataset.scholarships == [
            {
                "school_key": "alpha polytechnic",
                "name": "Gold Scholarship",
                "source": "Alpha Polytechnic",
                "eligibility": "Top students",
            }
        ]

    def test_the_new_files_are_recognised_by_their_headers(self):
        assert (
            identify_frame(frame("programmes", [{"school_name": "A"}])) == "programmes"
        )
        assert (
            identify_frame(frame("financial_aid", [{"school_name": "A"}]))
            == "financial_aid"
        )
        assert (
            identify_frame(frame("scholarships", [{"school_name": "A"}]))
            == "scholarships"
        )
