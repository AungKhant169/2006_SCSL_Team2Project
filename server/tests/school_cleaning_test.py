import pandas as pd

from core.school_cleaning import REQUIRED_COLUMNS, clean_schools


def frame(key, rows=()):
    """A raw file of the given kind; `rows` are dicts keyed by column name."""
    if not rows:
        return pd.DataFrame(columns=REQUIRED_COLUMNS[key])
    base = {column: None for column in REQUIRED_COLUMNS[key]}
    return pd.DataFrame([{**base, **row} for row in rows])


def clean_by_key(general_rows, secondary_rows=()):
    raw = {key: frame(key) for key in REQUIRED_COLUMNS}
    raw["general"] = frame("general", general_rows)
    raw["secondary"] = frame("secondary", secondary_rows)
    raw["sdp"] = pd.DataFrame(
        columns=["school_name", "alp_domain", "alp_title", "llp_domain1", "llp_title"]
    )
    return {s["school_key"]: s for s in clean_schools(raw).schools}


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
