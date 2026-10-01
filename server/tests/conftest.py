import os
import secrets
import shutil
import tempfile

TMP = tempfile.mkdtemp()

# Create a temporary database for tests.
os.environ["DATABASE_URL"] = f"sqlite:///{TMP}/test.db"
# Generate a random secret key for tests.
os.environ["SECRET_KEY"] = secrets.token_hex(32)

import pytest
from fastapi.testclient import TestClient

from main import app
from models.base import Base, engine
from models.user import User

# A mock HTTP client for the FastAPI server that does not require a running FastAPI instance.
client = TestClient(app)

# The default credentials used for the test cases.
USER = {"username": "alice", "password": "pass123!"}


class Authentication:
    def __init__(self, user: User, tokens: dict[str, str]):
        self.user = user
        self.tokens = tokens


def pytest_sessionfinish():
    """Runs automatically after every test is completed to cleanup the artifacts."""
    engine.dispose()  # Close File Handle
    shutil.rmtree(TMP, ignore_errors=True)


@pytest.fixture(autouse=True)
def reset_database():
    """Runs automatically before every test to ensure a fresh state for every test."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


@pytest.fixture
def authenticated() -> Authentication:
    """Register a dummy user and return the User object with its authorization tokens."""
    assert (response := client.post("/user/register", json=USER)).status_code == 200
    assert (user := User.get_by_key(username=USER["username"])) is not None
    return Authentication(user, response.json())
