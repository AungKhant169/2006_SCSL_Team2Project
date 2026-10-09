""" need to update """

from models.user import UserError
from tests.conftest import client

PAYLOAD = {"stage": "secondary"}


def test_requires_authentication():
    response = client.post("/roadmap/generate-ai", json=PAYLOAD)
    body = response.status_code, response.json()["detail"]
    assert UserError.ACCESS_TOKEN_INVALID.args == body