from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    redis_url: str
    ftc_api_username: str
    ftc_api_token: SecretStr
    ftc_api_season: int


@lru_cache
def get_settings() -> Settings:
    return Settings()
