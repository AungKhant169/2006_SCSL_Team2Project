from fastapi import status

from models.school_record import SchoolInfo, SchoolInfoError
from models.user import UserError
from tests.conftest import client


def headers(auth):
    return {"Authorization": f"Bearer {auth.tokens['access_token']}"}


def make_school(key, name):
    return SchoolInfo.create(school_key=key, school_name=name)


class TestBookmarks:
    def test_requires_authentication(self):
        response = client.get("/bookmark")
        body = response.status_code, response.json()["detail"]
        assert body == UserError.ACCESS_TOKEN_INVALID.args

    def test_starts_empty(self, authenticated):
        response = client.get("/bookmark", headers=headers(authenticated))
        assert response.json() == []

    def test_lists_schools_in_the_order_saved_with_their_ids(self, authenticated):
        first, second = make_school("a", "Alpha"), make_school("b", "Beta")
        for school in (second, first):
            response = client.put(
                f"/bookmark/{school.id}", headers=headers(authenticated)
            )
            assert response.status_code == status.HTTP_204_NO_CONTENT
        body = client.get("/bookmark", headers=headers(authenticated)).json()
        assert [school["id"] for school in body] == [second.id, first.id]
        assert body[0]["school_name"] == "Beta"

    def test_adding_twice_keeps_one(self, authenticated):
        school = make_school("a", "Alpha")
        for _ in range(2):
            client.put(f"/bookmark/{school.id}", headers=headers(authenticated))
        assert len(client.get("/bookmark", headers=headers(authenticated)).json()) == 1

    def test_unknown_school(self, authenticated):
        response = client.put("/bookmark/999", headers=headers(authenticated))
        assert (response.status_code, response.json()["detail"]) == (
            SchoolInfoError.SCHOOL_NOT_FOUND.args
        )

    def test_remove_is_idempotent(self, authenticated):
        school = make_school("a", "Alpha")
        client.put(f"/bookmark/{school.id}", headers=headers(authenticated))
        for _ in range(2):
            response = client.delete(
                f"/bookmark/{school.id}", headers=headers(authenticated)
            )
            assert response.status_code == status.HTTP_204_NO_CONTENT
        assert client.get("/bookmark", headers=headers(authenticated)).json() == []
