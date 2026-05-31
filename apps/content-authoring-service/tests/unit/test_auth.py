import pytest
from unittest.mock import patch
from fastapi import HTTPException
import logging

from src.infrastructure.auth import require_internal_secret

def test_require_internal_secret_success():
    # Test when correct internal secret is passed
    with patch("src.infrastructure.auth.INTERNAL_SECRET", "correct-secret"):
        # Should execute successfully without raising any exception
        require_internal_secret("correct-secret")

def test_require_internal_secret_mismatch():
    # Test when incorrect internal secret is passed
    with patch("src.infrastructure.auth.INTERNAL_SECRET", "correct-secret"):
        with pytest.raises(HTTPException) as exc_info:
            require_internal_secret("wrong-secret")
        assert exc_info.value.status_code == 401
        assert "Invalid internal service secret" in exc_info.value.detail

def test_require_internal_secret_fail_closed():
    # Test when INTERNAL_SECRET is unset/empty (fail-closed check)
    with patch("src.infrastructure.auth.INTERNAL_SECRET", ""):
        with pytest.raises(HTTPException) as exc_info:
            require_internal_secret("any-key")
        assert exc_info.value.status_code == 500
        assert "Internal service secret is not configured" in exc_info.value.detail
