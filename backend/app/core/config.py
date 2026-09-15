"""Application configuration module.
Loads environment settings securely with sensible production-ready fallbacks.
"""
import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """MANDIQ core backend configuration."""
    APP_NAME: str = "MANDIQ APMC FairProcure Platform"
    APP_ENV: str = "development"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql://postgres:saibaba7133@localhost:5432/mandiq"
    SECRET_KEY: str = "mandiq_fairprocure_hmac_secret_key_2026_production"
    
    # Security & Supervision
    SUPERVISOR_MASTER_PIN: str = "1234"
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["*"]
    
    # FairProcure QR Settings
    QR_EXPIRY_HOURS: int = 72
    QR_ISSUER: str = "MANDIQ APMC Platform"
    
    # Logging
    LOG_LEVEL: str = "INFO"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

