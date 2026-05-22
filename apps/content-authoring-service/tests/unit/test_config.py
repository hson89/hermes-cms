"""
Unit tests for configuration loading.
"""

import os
from unittest.mock import patch
from src.infrastructure.config import Settings


def test_settings_load_from_env():
    """Verify that settings can be loaded from environment variables."""
    with patch.dict(os.environ, {
        "LANGCHAIN_MODEL_PROVIDER": "anthropic",
        "LANGCHAIN_MODEL": "claude-3-5-sonnet-20240620",
        "ANTHROPIC_API_KEY": "test-key"
    }):
        # We need to re-initialize Settings to pick up the mocked environment
        settings = Settings()
        assert settings.LANGCHAIN_MODEL_PROVIDER == "anthropic"
        assert settings.LANGCHAIN_MODEL == "claude-3-5-sonnet-20240620"
        assert settings.ANTHROPIC_API_KEY == "test-key"


def test_settings_default_values():
    """Verify default values when environment is empty."""
    with patch.dict(os.environ, {}, clear=True):
        # Pass _env_file=None to skip loading from .env file
        settings = Settings(_env_file=None)
        assert settings.LANGCHAIN_MODEL_PROVIDER == "openai"
        assert settings.LANGCHAIN_MODEL == "gpt-4o-mini"
        assert settings.INTERNAL_SERVICE_SECRET == ""


def test_settings_load_endpoint_url():
    """Verify that LANGCHAIN_ENDPOINT_URL can be loaded."""
    with patch.dict(os.environ, {
        "LANGCHAIN_ENDPOINT_URL": "http://localhost:11434/v1"
    }):
        settings = Settings()
        assert settings.LANGCHAIN_ENDPOINT_URL == "http://localhost:11434/v1"


def test_settings_bypass_image_generation():
    """Verify that BYPASS_IMAGE_GENERATION can be loaded from env."""
    with patch.dict(os.environ, {
        "BYPASS_IMAGE_GENERATION": "false"
    }):
        settings = Settings()
        assert settings.BYPASS_IMAGE_GENERATION is False

    with patch.dict(os.environ, {
        "BYPASS_IMAGE_GENERATION": "true"
    }):
        settings = Settings()
        assert settings.BYPASS_IMAGE_GENERATION is True

