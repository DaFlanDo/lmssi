from __future__ import annotations
from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./lms.db"
    # Секреты — без значений по умолчанию: реальные значения берутся из .env
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_hours: int = 72
    upload_dir: str = "uploads"
    # Лимит на один загружаемый файл (видео в уроках — самые тяжёлые)
    max_upload_mb: int = 200

    # AI gateway (Wellflow — OpenAI-compatible). Ключ задаётся в .env (OPENAI_API_KEY).
    openai_api_key: str = ""
    openai_base_url: str = "https://api.wellflow.dev/v1"
    openai_model: str = "claude-sonnet-4.6"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("secret_key")
    @classmethod
    def _secret_key_must_be_set(cls, value: str) -> str:
        # С пустым ключом JWT подписывался бы пустой строкой — любой мог бы
        # выпустить себе токен администратора. Лучше не стартовать вовсе.
        if not value or value.startswith("change-me"):
            raise ValueError(
                "SECRET_KEY не задан. Сгенерируйте: openssl rand -hex 32 "
                "и пропишите в backend/.env (setup-скрипты делают это сами)"
            )
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
