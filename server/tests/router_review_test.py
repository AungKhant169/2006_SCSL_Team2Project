from fastapi import status

from models.review import ReviewError
from models.school_record import SchoolInfo
from tests.conftest import client


def headers(auth):
    return {"Authorization": f"Bearer {auth.tokens['access_token']}"}


def error(response):
    body = response.status_code, response.json()["detail"]
    return next((e for e in ReviewError if e.value == body), None)


def submit(auth, school, text="Great school"):
    return client.post(
        f"/review/school/{school.id}", json={"text": text}, headers=headers(auth)
    )


def make_school(key="first", name="First School"):
    return SchoolInfo.create(school_key=key, school_name=name)


class TestSubmit:
    def test_stores_the_review_under_the_author(self, authenticated):
        school = make_school()
        response = submit(authenticated, school)
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["username"] == "alice"
        assert body["school_id"] == school.id
        assert body["text"] == "Great school"
        assert body["updated_at"] is None
        # Marked as UTC so the browser converts it to local time.
        assert body["created_at"].endswith("+00:00")

    def test_strips_tags_and_rejects_blank_text(self, authenticated):
        assert (
            submit(authenticated, make_school(), "<b>Nice</b>").json()["text"] == "Nice"
        )
        other = make_school("second", "Second")
        assert (
            error(submit(authenticated, other, "<i> </i>")) == ReviewError.REVIEW_BLANK
        )

    def test_rejects_more_than_200_words(self, authenticated):
        response = submit(authenticated, make_school(), "word " * 201)
        assert error(response) == ReviewError.REVIEW_TOO_LONG

    def test_one_review_per_school(self, authenticated):
        school = make_school()
        submit(authenticated, school)
        assert error(submit(authenticated, school)) == ReviewError.REVIEW_ALREADY_EXISTS


class TestList:
    def test_is_public(self, authenticated):
        school = make_school()
        review = submit(authenticated, school).json()
        response = client.get(f"/review/school/{school.id}")
        assert [r["id"] for r in response.json()] == [review["id"]]


class TestEditAndDelete:
    def test_edit_marks_the_review_as_edited(self, authenticated):
        review = submit(authenticated, make_school()).json()
        response = client.patch(
            f"/review/{review['id']}",
            json={"text": "Even better"},
            headers=headers(authenticated),
        )
        body = response.json()
        assert body["text"] == "Even better"
        assert body["updated_at"] is not None

    def test_only_the_author_can_change_a_review(self, authenticated):
        review = submit(authenticated, make_school()).json()
        other_user = {"username": "bob", "password": "pass123!"}
        tokens = client.post("/user/register", json=other_user).json()
        other = {"Authorization": f"Bearer {tokens['access_token']}"}
        patch = client.patch(
            f"/review/{review['id']}", json={"text": "x"}, headers=other
        )
        assert error(patch) == ReviewError.REVIEW_FORBIDDEN
        delete = client.delete(f"/review/{review['id']}", headers=other)
        assert error(delete) == ReviewError.REVIEW_FORBIDDEN

    def test_delete_removes_the_review(self, authenticated):
        school = make_school()
        review = submit(authenticated, school).json()
        response = client.delete(
            f"/review/{review['id']}", headers=headers(authenticated)
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert client.get(f"/review/school/{school.id}").json() == []

    def test_unknown_review(self, authenticated):
        response = client.delete("/review/999", headers=headers(authenticated))
        assert error(response) == ReviewError.REVIEW_NOT_FOUND
