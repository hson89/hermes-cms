"""
Integration tests to verify that exception/error details are not exposed to clients in production environments,
while remaining detailed in development environments.
Covers:
1. /api/ai/template-builder/generate
2. /api/ai/draft
3. /api/ai/refine
4. /api/ai/sessions/{session_id}/message
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.main import app

TENANT_ID = str(uuid4())
USER_ID = str(uuid4())

@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as c:
        yield c

# ── 1. Template Builder Endpoint Error Exposure Tests ─────────────────────────

def test_generate_template_failure_development_exposes_details(client: TestClient) -> None:
    """In development environment, detailed template builder error messages should be exposed."""
    mock_result = {
        "status": "failed",
        "errors": ["Database connection timeout! Sensitive stack trace details..."]
    }
    with patch(
        "src.application.template_builder_service.TemplateBuilderService.generate_template",
        new_callable=AsyncMock,
        return_value=mock_result
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "development"
    ):
        response = client.post(
            "/api/ai/template-builder/generate",
            json={
                "design_html": "<html></html>",
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
            }
        )
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.json()["detail"] == "Database connection timeout! Sensitive stack trace details..."

def test_generate_template_failure_production_hides_details(client: TestClient) -> None:
    """In production environment, detailed template builder error messages should NOT be exposed."""
    mock_result = {
        "status": "failed",
        "errors": ["Database connection timeout! Sensitive stack trace details..."]
    }
    with patch(
        "src.application.template_builder_service.TemplateBuilderService.generate_template",
        new_callable=AsyncMock,
        return_value=mock_result
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "production"
    ):
        response = client.post(
            "/api/ai/template-builder/generate",
            json={
                "design_html": "<html></html>",
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
            }
        )
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.json()["detail"] == "An internal error occurred during template generation."


# ── 2. Draft Endpoint Error Exposure Tests ────────────────────────────────────

def test_draft_failure_development_exposes_details(client: TestClient) -> None:
    """In development environment, draft exception details should be exposed in the stream."""
    with patch(
        "src.application.drafting_service.DraftingService.generate_draft_stream",
        side_effect=RuntimeError("LLM API failed with 401 Unauthorized")
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "development"
    ):
        response = client.post(
            "/api/ai/draft",
            json={
                "prompt": "write a blog post",
                "content_schema": {},
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
            }
        )
    assert response.status_code == 200
    events = response.text.strip().split("\n\n")
    error_event = next(e for e in events if "event: ERROR" in e)
    data_line = next(line for line in error_event.split("\n") if line.startswith("data: "))
    data = json.loads(data_line[6:])
    assert "LLM API failed with 401 Unauthorized" in data["detail"]

def test_draft_failure_production_hides_details(client: TestClient) -> None:
    """In production environment, draft exception details should be replaced with a generic message."""
    with patch(
        "src.application.drafting_service.DraftingService.generate_draft_stream",
        side_effect=RuntimeError("LLM API failed with 401 Unauthorized")
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "production"
    ):
        response = client.post(
            "/api/ai/draft",
            json={
                "prompt": "write a blog post",
                "content_schema": {},
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
            }
        )
    assert response.status_code == 200
    events = response.text.strip().split("\n\n")
    error_event = next(e for e in events if "event: ERROR" in e)
    data_line = next(line for line in error_event.split("\n") if line.startswith("data: "))
    data = json.loads(data_line[6:])
    assert data["detail"] == "An internal error occurred during draft generation."


# ── 3. Refine Endpoint Error Exposure Tests ───────────────────────────────────

def test_refine_failure_development_exposes_details(client: TestClient) -> None:
    """In development environment, refine exception details should be exposed in the stream."""
    with patch(
        "src.application.refine_service.RefineService.refine_draft_stream",
        side_effect=RuntimeError("LLM Refinement connection timeout")
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "development"
    ):
        response = client.post(
            "/api/ai/refine",
            json={
                "prompt": "make it short",
                "current_draft_json": {},
                "content_schema": {},
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
            }
        )
    assert response.status_code == 200
    events = response.text.strip().split("\n\n")
    error_event = next(e for e in events if "event: ERROR" in e)
    data_line = next(line for line in error_event.split("\n") if line.startswith("data: "))
    data = json.loads(data_line[6:])
    assert "LLM Refinement connection timeout" in data["detail"]

def test_refine_failure_production_hides_details(client: TestClient) -> None:
    """In production environment, refine exception details should be replaced with a generic message."""
    with patch(
        "src.application.refine_service.RefineService.refine_draft_stream",
        side_effect=RuntimeError("LLM Refinement connection timeout")
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "production"
    ):
        response = client.post(
            "/api/ai/refine",
            json={
                "prompt": "make it short",
                "current_draft_json": {},
                "content_schema": {},
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
            }
        )
    assert response.status_code == 200
    events = response.text.strip().split("\n\n")
    error_event = next(e for e in events if "event: ERROR" in e)
    data_line = next(line for line in error_event.split("\n") if line.startswith("data: "))
    data = json.loads(data_line[6:])
    assert data["detail"] == "An internal error occurred during draft refinement."


# ── 4. Session Message Endpoint Error Exposure Tests ─────────────────────────

def test_session_message_failure_development_exposes_details(client: TestClient) -> None:
    """In development environment, session message exception details should be exposed in the stream."""
    session_id = str(uuid4())
    with patch(
        "src.application.ai_service.AIService.get_session",
        new_callable=AsyncMock,
        return_value=MagicMock(tenant_id=TENANT_ID)
    ), patch(
        "src.application.ai_service.AIService.continue_generation_session_stream",
        side_effect=RuntimeError("Session DB connection failed")
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "development"
    ):
        response = client.post(
            f"/api/ai/sessions/{session_id}/message",
            json={
                "prompt": "add a tag field",
                "tenant_id": TENANT_ID
            }
        )
    assert response.status_code == 200
    events = response.text.strip().split("\n\n")
    error_event = next(e for e in events if "event: ERROR" in e)
    data_line = next(line for line in error_event.split("\n") if line.startswith("data: "))
    data = json.loads(data_line[6:])
    assert "Session DB connection failed" in data["detail"]

def test_session_message_failure_production_hides_details(client: TestClient) -> None:
    """In production environment, session message exception details should be replaced with a generic message."""
    session_id = str(uuid4())
    with patch(
        "src.application.ai_service.AIService.get_session",
        new_callable=AsyncMock,
        return_value=MagicMock(tenant_id=TENANT_ID)
    ), patch(
        "src.application.ai_service.AIService.continue_generation_session_stream",
        side_effect=RuntimeError("Session DB connection failed")
    ), patch(
        "src.infrastructure.config.settings.ENVIRONMENT",
        "production"
    ):
        response = client.post(
            f"/api/ai/sessions/{session_id}/message",
            json={
                "prompt": "add a tag field",
                "tenant_id": TENANT_ID
            }
        )
    assert response.status_code == 200
    events = response.text.strip().split("\n\n")
    error_event = next(e for e in events if "event: ERROR" in e)
    data_line = next(line for line in error_event.split("\n") if line.startswith("data: "))
    data = json.loads(data_line[6:])
    assert data["detail"] == "An internal error occurred during session message processing."
