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
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/hermes_authoring"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"

    # Security
    INTERNAL_SERVICE_SECRET: str = ""
    CMS_ENGINE_URL: str = "http://localhost:3000"

    # LLM Configuration
    LANGCHAIN_MODEL_PROVIDER: str = "openai"
    LANGCHAIN_MODEL: str = "gpt-4o-mini"
    LANGCHAIN_ENDPOINT_URL: str | None = None

    # Image Configuration
    IMAGE_MODEL_PROVIDER: str = "openai"
    IMAGE_MODEL: str = "dall-e-3"
    IMAGE_ENDPOINT_URL: str | None = None
    FALLBACK_IMAGE_URL: str = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1024&auto=format&fit=crop&q=80"

    # NVIDIA Configuration
    NVIDIA_TEMPERATURE: float = 0.6
    NVIDIA_TOP_P: float = 0.95
    NVIDIA_MAX_TOKENS: int = 65536
    NVIDIA_REASONING_BUDGET: int = 16384
    NVIDIA_ENABLE_THINKING: bool = True

    # API Keys (optional at startup, validated by providers on use)
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    GOOGLE_API_KEY: str | None = None
    MISTRAL_API_KEY: str | None = None
    NVIDIA_API_KEY: str | None = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global settings instance
settings = Settings()
