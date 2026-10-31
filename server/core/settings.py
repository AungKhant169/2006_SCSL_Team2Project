from pathlib import Path

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # Automatically loads the .env file in server/.env if it exists.
    # Real environment variables take priority over it (e.g., Docker).
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    admin_usernames: str = ""
    database_url: str = "sqlite:///./main.db"
    frontend_origin: str
    openai_api_key: str = ""
    openai_model: str = "gpt-5.5"
    school_max_upload_mb: float = 20
    school_raw_dir: Path | None = None
    secret_key: SecretStr

    @field_validator("frontend_origin")
    @classmethod
    def frontend_origin_validator(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("FRONTEND_ORIGIN must not be empty.")
        return value.strip()

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
