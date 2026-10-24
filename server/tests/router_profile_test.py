import pytest
from fastapi import status

from models.profile import ProfileError
from models.user import UserError
from tests.conftest import client


def headers(auth):
    return {"Authorization": f"Bearer {auth.tokens['access_token']}"}


def error(response):
    body = response.status_code, response.json()["detail"]
    return next((e for e in ProfileError if e.args == body), None)


def save(auth, **fields):
    profile = {"level": "secondary", "score_a": 8, "postal": "556000"}
    return client.put("/profile", json=profile | fields, headers=headers(auth))


class TestGetProfile:
    def test_requires_authentication(self):
        response = client.get("/profile")
        body = response.status_code, response.json()["detail"]
        assert body == UserError.ACCESS_TOKEN_INVALID.args

    def test_new_account_gets_the_starting_values(self, authenticated):
        response = client.get("/profile", headers=headers(authenticated))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {
            "level": "secondary",
            "score_a": None,
            "score_b": None,
            "postal": None,
            "primary_result": "None",
        }

    def test_returns_what_was_saved(self, authenticated):
        save(authenticated, level="postsec", score_a=12, score_b=9)
        body = client.get("/profile", headers=headers(authenticated)).json()
        assert body["level"] == "postsec"
        assert (body["score_a"], body["score_b"]) == (12, 9)
        assert body["postal"] == "556000"


class TestSaveProfile:
    def test_save_replaces_the_previous_profile(self, authenticated):
        save(authenticated)
        response = save(authenticated, level="uni", score_a=3.55, score_b=None)
        body = response.json()
        assert (body["level"], body["score_a"], body["score_b"]) == ("uni", 3.55, None)

    def test_scores_the_level_does_not_use_are_dropped(self, authenticated):
        body = save(authenticated, score_b=20).json()
        assert body["score_b"] is None
        body = save(authenticated, level="primary", score_a=8).json()
        assert (body["score_a"], body["score_b"]) == (None, None)

    def test_keeps_the_kindergarten_result(self, authenticated):
        body = save(
            authenticated,
            level="primary",
            score_a=None,
            primary_result="Kindergarten completion",
        ).json()
        assert body["primary_result"] == "Kindergarten completion"

    @pytest.mark.parametrize("postal", ["", "55600", "5560000", "55600a"])
    def test_rejects_a_malformed_postal_code(self, authenticated, postal):
        assert error(save(authenticated, postal=postal)) == ProfileError.INVALID_POSTAL

    def test_rejects_an_unknown_level(self, authenticated):
        response = save(authenticated, level="kindergarten")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    @pytest.mark.parametrize(
        ("fields", "expected"),
        [
            pytest.param({"score_a": 3}, ProfileError.INVALID_PSLE, id="psle-low"),
            pytest.param({"score_a": 33}, ProfileError.INVALID_PSLE, id="psle-high"),
            pytest.param(
                {"score_a": 8.5}, ProfileError.INVALID_PSLE, id="psle-fraction"
            ),
            pytest.param({"score_a": None}, ProfileError.INVALID_PSLE, id="psle-blank"),
            pytest.param(
                {"level": "postsec", "score_a": None},
                ProfileError.MISSING_O_LEVEL,
                id="o-level-blank",
            ),
            pytest.param(
                {"level": "postsec", "score_a": 1},
                ProfileError.INVALID_L1R5,
                id="l1r5-low",
            ),
            pytest.param(
                {"level": "postsec", "score_a": 55},
                ProfileError.INVALID_L1R5,
                id="l1r5-high",
            ),
            pytest.param(
                {"level": "postsec", "score_a": None, "score_b": -1},
                ProfileError.INVALID_ELR2B2,
                id="elr2b2-negative",
            ),
            pytest.param(
                {"level": "uni", "score_a": None},
                ProfileError.MISSING_UNI_SCORE,
                id="uni-blank",
            ),
            pytest.param(
                {"level": "uni", "score_a": 4.01},
                ProfileError.INVALID_GPA,
                id="gpa-high",
            ),
            pytest.param(
                {"level": "uni", "score_a": None, "score_b": 91},
                ProfileError.INVALID_RANK_POINTS,
                id="rank-points-high",
            ),
        ],
    )
    def test_rejects_invalid_academic_scores(self, authenticated, fields, expected):
        assert error(save(authenticated, **fields)) == expected

    @pytest.mark.parametrize(
        "fields",
        [
            pytest.param({"score_a": 4}, id="psle-best"),
            pytest.param({"score_a": 32}, id="psle-worst"),
            pytest.param({"level": "postsec", "score_a": 2}, id="l1r5-lowest"),
            pytest.param(
                {"level": "postsec", "score_a": None, "score_b": 0}, id="elr2b2"
            ),
            pytest.param({"level": "uni", "score_a": 0}, id="gpa-zero"),
            pytest.param(
                {"level": "uni", "score_a": None, "score_b": 90}, id="rank-top"
            ),
            pytest.param({"level": "preschool", "score_a": None}, id="preschool"),
        ],
    )
    def test_accepts_the_boundary_values(self, authenticated, fields):
        assert save(authenticated, **fields).status_code == status.HTTP_200_OK
