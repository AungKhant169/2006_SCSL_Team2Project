import subprocess
import sys

import pytest
from pydantic import ValidationError

from core.settings import ENV_FILE, Settings, settings
from models.base import engine

GOOD_KEY = "a" * 64


@pytest.fixture
def env(monkeypatch):
    """A valid environment, ignoring any real server/.env (tests build Settings(_env_file=None))."""
    monkeypatch.setenv("SECRET_KEY", GOOD_KEY)
    monkeypatch.setenv("FRONTEND_ORIGIN", "http://localhost:5173")
    return monkeypatch


@pytest.mark.parametrize("key", [None, "", "CHANGE-ME", "x" * 31])
def test_unsafe_secret_key_is_rejected(env, key):
    env.delenv("SECRET_KEY") if key is None else env.setenv("SECRET_KEY", key)
    with pytest.raises(ValidationError, match="(?i)secret_key"):
        Settings(_env_file=None)


@pytest.mark.parametrize("origin", [None, "", "   "])
def test_empty_frontend_origin_is_rejected(env, origin):
    if origin is None:
        env.delenv("FRONTEND_ORIGIN")
    else:
        env.setenv("FRONTEND_ORIGIN", origin)

    with pytest.raises(ValidationError, match="(?i)frontend_origin"):
        Settings(_env_file=None)


def test_admin_usernames_are_split_and_lowercased(env):
    env.setenv("ADMIN_USERNAMES", " Boss, ,Ann ")
    assert Settings(_env_file=None).admin_username_set == {"boss", "ann"}


def test_dotenv_values_are_read(env, tmp_path):
    """Regression: DATABASE_URL in .env used to be ignored."""
    env.delenv("DATABASE_URL", raising=False)
    dotenv = tmp_path / ".env"
    dotenv.write_text("DATABASE_URL=sqlite:///from_dotenv.db\n")
    assert Settings(_env_file=dotenv).database_url == "sqlite:///from_dotenv.db"


def test_real_environment_beats_dotenv(env, tmp_path):
    dotenv = tmp_path / ".env"
    dotenv.write_text("DATABASE_URL=sqlite:///from_dotenv.db\n")
    env.setenv("DATABASE_URL", "sqlite:///from_env.db")
    assert Settings(_env_file=dotenv).database_url == "sqlite:///from_env.db"


def test_settings_are_wired_into_the_app():
    assert Settings.model_config["env_file"] == ENV_FILE
    assert str(engine.url) == settings.database_url


@pytest.mark.parametrize(
    "bad_env",
    [{"SECRET_KEY": "CHANGE-ME"}, {"FRONTEND_ORIGIN": ""}],
    ids=["key", "origin"],
)
def test_invalid_settings_stop_the_app_from_importing(tmp_path, bad_env):
    env = {
        "PATH": "",
        "PYTHONPATH": str(ENV_FILE.parent),
        "SECRET_KEY": GOOD_KEY,
        "FRONTEND_ORIGIN": "http://x.test",
        **bad_env,
    }
    result = subprocess.run(
        [sys.executable, "-c", "import main"],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert next(iter(bad_env)) in result.stderr.upper()
