import pandas as pd
import pytest

from core.school_cleaning import (
    REQUIRED_COLUMNS,
    SchoolDataError,
    clean_schools,
    identify_frame,
)


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


def bench(**fields):
    return {
        "school_name": "ALPHA POLYTECHNIC",
        "year": 2025,
        "measure": "ELR2B2",
        **fields,
    }


class TestBenchmarks:
    def test_rows_become_numbers_for_the_school(self):
        dataset = clean(
            GENERAL,
            benchmarks=[bench(low="5", high="22"), bench(year="2024", low=6, high=24)],
        )
        assert dataset.benchmarks == [
            {
                "school_key": "alpha polytechnic",
                "year": 2025,
                "measure": "ELR2B2",
                "low": 5.0,
                "high": 22.0,
            },
            {
                "school_key": "alpha polytechnic",
                "year": 2024,
                "measure": "ELR2B2",
                "low": 6.0,
                "high": 24.0,
            },
        ]

    def test_a_blank_high_is_a_single_figure(self):
        dataset = clean(GENERAL, benchmarks=[bench(measure="L1R5", low=7)])
        assert (dataset.benchmarks[0]["low"], dataset.benchmarks[0]["high"]) == (7, 7)

    @pytest.mark.parametrize(
        ("written", "measure"),
        [
            ("elr2b2", "ELR2B2"),
            (" L1R5 ", "L1R5"),
            ("PSLE AL", "PSLE_AL"),
            ("psle-al", "PSLE_AL"),
            ("gpa", "GPA"),
        ],
    )
    def test_the_measure_may_be_written_loosely(self, written, measure):
        dataset = clean(GENERAL, benchmarks=[bench(measure=written, low=1, high=2)])
        assert dataset.benchmarks[0]["measure"] == measure

    @pytest.mark.parametrize(
        "row",
        [
            {"measure": "CGPA"},
            {"measure": None},
            {"year": "last year"},
            {"year": 2025.5},
            {"year": None},
            {"low": None},
            {"low": "n/a"},
        ],
        ids=[
            "unknown-measure",
            "no-measure",
            "text-year",
            "fractional-year",
            "no-year",
            "no-low",
            "text-low",
        ],
    )
    def test_a_row_that_cannot_be_used_refuses_the_file(self, row):
        with pytest.raises(SchoolDataError, match="benchmarks"):
            clean(GENERAL, benchmarks=[bench(**{"low": 5, "high": 22, **row})])

    def test_the_error_names_the_line_of_the_file(self):
        rows = [
            bench(low=5, high=22),
            bench(year=2024, low=5, high=22),
            bench(measure="X", low=1),
        ]
        with pytest.raises(SchoolDataError, match="line 4"):
            clean(GENERAL, benchmarks=rows)

    def test_a_low_figure_above_the_high_one_refuses_the_file(self):
        with pytest.raises(SchoolDataError, match="low figure is above"):
            clean(GENERAL, benchmarks=[bench(low=30, high=22)])

    def test_rows_for_unknown_schools_are_skipped_with_a_warning(self):
        dataset = clean(GENERAL, benchmarks=[bench(school_name="GHOST", low=1, high=2)])
        assert dataset.benchmarks == []
        assert any(
            "'benchmarks': 1 name(s) match no school" in w for w in dataset.warnings
        )

    def test_a_repeated_year_keeps_the_last_row_and_warns(self):
        dataset = clean(
            GENERAL, benchmarks=[bench(low=5, high=22), bench(low=6, high=23)]
        )
        assert [(b["low"], b["high"]) for b in dataset.benchmarks] == [(6, 23)]
        assert any("repeated" in w for w in dataset.warnings)

    def test_an_empty_file_is_fine(self):
        assert clean(GENERAL, benchmarks=[]).benchmarks == []

    def test_the_file_may_be_left_out_altogether(self):
        raw = {key: frame(key) for key in REQUIRED_COLUMNS if key != "benchmarks"}
        raw["general"] = frame("general", GENERAL)
        raw["sdp"] = pd.DataFrame(
            columns=[
                "school_name",
                "alp_domain",
                "alp_title",
                "llp_domain1",
                "llp_title",
            ]
        )
        assert len(clean_schools(raw).schools) == 1

    def test_other_files_may_not_be_left_out(self):
        raw = {key: frame(key) for key in REQUIRED_COLUMNS if key != "moe"}
        with pytest.raises(SchoolDataError, match="moe"):
            clean_schools(raw)

    def test_the_file_is_recognised_by_its_headers(self):
        assert identify_frame(frame("benchmarks", [bench()])) == "benchmarks"
