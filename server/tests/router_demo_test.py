from time import monotonic

import pytest

from core.settings import settings
from routers.demo import MAX_SESSIONS, Session, creation_limiter, sessions
from tests.conftest import client


@pytest.fixture(autouse=True)
def demo_enabled(monkeypatch):
    monkeypatch.setattr(settings, "demo_enabled", True)
    sessions.clear()
    creation_limiter.clear()
    yield
    sessions.clear()


def create():
    response = client.post(
        "/demo/sessions", json={"script_id": "pathsg-v1", "step_count": 23}
    )
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def auth(pair, role="control"):
    return {"Authorization": f"Bearer {pair[role + '_key']}"}


def test_disabled_on_normal_deployments(monkeypatch):
    monkeypatch.setattr(settings, "demo_enabled", False)
    assert client.post("/demo/sessions", json={}).status_code == 404


def test_pairing_keys_are_distinct_and_required():
    pair = create()
    path = f"/demo/sessions/{pair['id']}"
    assert pair["control_key"] != pair["display_key"]
    assert client.get(path).status_code == 422
    assert (
        client.get(path, headers={"Authorization": "Bearer wrong"}).status_code == 403
    )
    response = client.get(path, headers=auth(pair, "display"))
    assert response.status_code == 200
    assert response.json()["display_connected"] is True
    assert "control_key" not in response.json()
    assert "display_key" not in response.json()


def test_only_controller_can_change_or_end_session():
    pair = create()
    path = f"/demo/sessions/{pair['id']}"
    response = client.post(
        path + "/command",
        headers=auth(pair, "display"),
        json={"action": "next", "version": 0},
    )
    assert response.status_code == 403
    assert client.delete(path, headers=auth(pair, "display")).status_code == 403
    assert client.delete(path, headers=auth(pair)).status_code == 204
    assert client.get(path, headers=auth(pair)).status_code == 404


def test_stale_commands_do_not_skip_steps():
    pair = create()
    path = f"/demo/sessions/{pair['id']}/command"
    body = {"action": "next", "version": 0}
    response = client.post(path, headers=auth(pair), json=body)
    assert response.json()["step"] == 1
    assert response.json()["version"] == 1
    assert client.post(path, headers=auth(pair), json=body).status_code == 409
    assert sessions[pair["id"]].step == 1


def test_step_boundaries_and_pause_spotlight_restart():
    pair = create()
    path = f"/demo/sessions/{pair['id']}/command"
    version = 0

    def command(action, **kwargs):
        nonlocal version
        response = client.post(
            path,
            headers=auth(pair),
            json={"action": action, "version": version, **kwargs},
        )
        if response.status_code == 200:
            version = response.json()["version"]
        return response

    assert command("previous").json()["step"] == 0
    assert command("goto", step=23).status_code == 422
    assert command("goto").status_code == 422
    assert command("goto", step=22).json()["step"] == 22
    assert command("next").json()["step"] == 22
    assert command("pause").json()["paused"] is True
    assert command("spotlight").json()["spotlight"] is False
    assert command("refocus").json()["step"] == 22
    assert command("restart").json()["step"] == 0
    assert sessions[pair["id"]].paused is False


def test_display_acknowledgement_is_versioned():
    pair = create()
    path = f"/demo/sessions/{pair['id']}"
    body = {"version": 0, "message": "Feature ready on the display."}
    assert client.post(path + "/ack", headers=auth(pair), json=body).status_code == 403
    assert (
        client.post(path + "/ack", headers=auth(pair, "display"), json=body).status_code
        == 204
    )
    client.post(
        path + "/command", headers=auth(pair), json={"action": "next", "version": 0}
    )
    client.post(path + "/ack", headers=auth(pair, "display"), json=body)
    state = client.get(path, headers=auth(pair)).json()
    assert state["acknowledged_version"] == 0
    assert state["version"] == 1


def test_expiration_and_disconnected_display():
    pair = create()
    path = f"/demo/sessions/{pair['id']}"
    session = sessions[pair["id"]]
    session.display_seen = monotonic() - 7
    assert client.get(path, headers=auth(pair)).json()["display_connected"] is False
    session.expires = monotonic() - 1
    assert client.get(path, headers=auth(pair)).status_code == 404
    assert pair["id"] not in sessions


def test_session_limits_and_validation():
    assert (
        client.post(
            "/demo/sessions", json={"script_id": "unknown", "step_count": 23}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/demo/sessions", json={"script_id": "pathsg-v1", "step_count": 65}
        ).status_code
        == 422
    )
    for index in range(MAX_SESSIONS):
        sessions[str(index)] = Session(step_count=23)
    assert (
        client.post(
            "/demo/sessions", json={"script_id": "pathsg-v1", "step_count": 23}
        ).status_code
        == 429
    )
