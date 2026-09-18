"""
backend/config/settings.py
Centralized configuration settings for SkyGuard AI backend using Pydantic Settings.
"""

from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SkyGuard AI — Intelligent AWS Anomaly Detection Platform"
    API_V1_STR: str = "/api"

    # Database Settings
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "skyguard_db"

    # JWT Security Settings
    SECRET_KEY: str = "SKYGUARD_SUPER_SECRET_JWT_KEY_SIH_2026_998877665544332211"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Weather API Settings
    WEATHER_API_KEY: Optional[str] = "DEMO_OPEN_WEATHER_KEY"
    WEATHER_API_BASE_URL: str = "https://api.open-meteo.com/v1"

    # Alert Cooldown (Seconds)
    ALERT_COOLDOWN_SECONDS: int = 300

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
