"""
Conftest configuration for pytest in AI Agent Service.
Satisfies T003.
"""

from __future__ import annotations

from typing import Generator

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.infrastructure.auth import require_internal_secret


@pytest.fixture(autouse=True)
def bypass_auth_verification() -> Generator[None, None, None]:
    """Automatically bypass internal secret verification for all tests by default."""
    app.dependency_overrides[require_internal_secret] = lambda: None
    yield
    app.dependency_overrides.clear()
