"""
Configuration management for the AI Agent Service.
Uses pydantic-settings to load variables from environment or .env file.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings.
    """

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/hermes_ai"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    # Security
    INTERNAL_SERVICE_SECRET: str = ""

    # LLM Configuration
    LANGCHAIN_MODEL_PROVIDER: str = "openai"
    LANGCHAIN_MODEL: str = "gpt-4o-mini"
    LANGCHAIN_ENDPOINT_URL: str | None = None

    # API Keys (optional at startup, validated by providers on use)
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GOOGLE_API_KEY: str | None = None
    MISTRAL_API_KEY: str | None = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global settings instance
settings = Settings()
