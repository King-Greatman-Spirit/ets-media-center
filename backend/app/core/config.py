from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    APP_NAME: str = "ETS Media Command Center"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = Field(default="change-me-in-production")
    JWT_EXPIRY_MINUTES: int = 60

    DATABASE_URL: str = Field(default="postgresql://ets:ets@localhost:5432/ets")
    SUPABASE_URL: str = Field(default="")
    SUPABASE_SERVICE_KEY: str = Field(default="")
    SUPABASE_ANON_KEY: str = Field(default="")

    OPENAI_API_KEY: str = Field(default="")
    ANTHROPIC_API_KEY: str = Field(default="")
    WHISPER_MODEL: str = Field(default="large-v3")

    YOUTUBE_API_KEY: str = Field(default="")
    YOUTUBE_CLIENT_ID: str = Field(default="")
    YOUTUBE_CLIENT_SECRET: str = Field(default="")

    TWITTER_API_KEY: str = Field(default="")
    TWITTER_API_SECRET: str = Field(default="")
    TWITTER_ACCESS_TOKEN: str = Field(default="")
    TWITTER_ACCESS_SECRET: str = Field(default="")

    META_APP_ID: str = Field(default="")
    META_APP_SECRET: str = Field(default="")
    META_ACCESS_TOKEN: str = Field(default="")

    LINKEDIN_CLIENT_ID: str = Field(default="")
    LINKEDIN_CLIENT_SECRET: str = Field(default="")
    LINKEDIN_ACCESS_TOKEN: str = Field(default="")

    TELEGRAM_BOT_TOKEN: str = Field(default="")

    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0")

    STORAGE_PATH: str = Field(default="./storage")
    MAX_FILE_SIZE: int = Field(default=2 * 1024 * 1024 * 1024)

    class Config:
        env_file = ".env"


settings = Settings()
