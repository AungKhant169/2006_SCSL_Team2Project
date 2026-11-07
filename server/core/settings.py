from pathlib import Path

from pydantic import (
    NonNegativeFloat,
    NonNegativeInt,
    PositiveInt,
    SecretStr,
    field_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

DEFAULT_OPENAI_MODEL = "gpt-5.5"


class Settings(BaseSettings):
    # Automatically loads the .env file in server/.env if it exists.
    # Real environment variables take priority over it (e.g., Docker).
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    admin_usernames: str = ""
    ai_rate_limit: int = 10
    ai_rate_window: int = 300
    # Daily backup of the SQLite database (SAFE-1). 0 hours turns it off. Without a directory,
    # the copies go in a "backups" folder next to the database file.
    backup_dir: Path | None = None
    backup_interval_hours: NonNegativeFloat = 24
    backup_keep: PositiveInt = 7
    database_url: str = "sqlite:///./main.db"
    frontend_origin: str
    login_rate_limit: int = 5
    login_rate_window: int = 300
    openai_api_key: str = ""
    openai_model: str = DEFAULT_OPENAI_MODEL
    school_max_upload_mb: float = 20
    school_raw_dir: Path | None = None
    secret_key: SecretStr
    trusted_proxy_hops: NonNegativeInt = 0

    @field_validator("frontend_origin")
    @classmethod
    def frontend_origin_validator(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("FRONTEND_ORIGIN must not be empty.")
        return value.strip()

    @field_validator("openai_model")
    @classmethod
    def openai_model_validator(cls, value: str) -> str:
        # docker compose passes a variable that is not set as an empty string, which would
        # otherwise be sent to OpenAI as the model name.
        return value.strip() or DEFAULT_OPENAI_MODEL

    @field_validator("secret_key")
    @classmethod
    def secret_key_validator(cls, value: SecretStr) -> SecretStr:
        key = value.get_secret_value().strip()
        if len(key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters.")
        return value

    @property
    def admin_username_set(self) -> set[str]:
        return {n.strip().lower() for n in self.admin_usernames.split(",") if n.strip()}


settings = Settings()
