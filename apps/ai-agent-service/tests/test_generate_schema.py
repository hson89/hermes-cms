"""
Failing TDD unit and contract tests for /api/ai/generate-schema.
Satisfies T009.

These tests cover:
1. JSON schema structure and field type validation.
2. Corrective feedback loop retry logic (up to 3 retries).
3. FastAPI endpoint request/response contracts and error handling.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.domain.ai_agent_session.models import SessionStatus

from src.domain.schema_validator import validate_content_schema, InvalidSchemaError


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


# ── 1. Schema Validator Unit Tests ──────────────────────────────────────────

def test_validator_accepts_valid_schema():
    """Verify that a correct content schema configuration passes validation."""
    valid_schema = {
        "name": "Product Catalog",
        "fields": [
            {"name": "title", "type": "text", "required": True, "label": "Title"},
            {"name": "price", "type": "number", "required": False, "label": "Price"},
            {"name": "isFeatured", "type": "boolean", "required": False, "label": "Featured"},
            {"name": "description", "type": "richText", "required": False, "label": "Description"},
        ]
    }
    # Should run without raising any exceptions
    validate_content_schema(valid_schema)


def test_validator_rejects_missing_name_or_fields():
    """Verify that a schema missing root keys is rejected."""
    invalid_schema = {
        "fields": [{"name": "title", "type": "text", "required": True, "label": "Title"}]
    }
    with pytest.raises(InvalidSchemaError, match="name is required"):
        validate_content_schema(invalid_schema)


def test_validator_rejects_unsupported_field_type():
    """Verify that hallucinated or unsupported field types are strictly rejected."""
    invalid_schema = {
        "name": "Article",
        "fields": [
            {"name": "title", "type": "text", "required": True, "label": "Title"},
            {"name": "content", "type": "markdown", "required": True, "label": "Content"}  # 'markdown' is unsupported!
        ]
    }
    with pytest.raises(InvalidSchemaError, match="Field 'content' has unsupported type 'markdown'"):
        validate_content_schema(invalid_schema)


def test_validator_rejects_duplicate_field_names():
    """Verify that schemas with duplicate field names (slugs) are rejected."""
    invalid_schema = {
        "name": "Article",
        "fields": [
            {"name": "title", "type": "text", "required": True, "label": "Title"},
            {"name": "title", "type": "richText", "required": False, "label": "Description"}
        ]
    }
    with pytest.raises(InvalidSchemaError, match="Duplicate field name 'title'"):
        validate_content_schema(invalid_schema)


# ── 2. Corrective Feedback Loop Unit Tests ──────────────────────────────────

@pytest.mark.asyncio
async def test_corrective_loop_succeeds_on_first_retry():
    """
    Verify that the corrective feedback loop triggers when the LLM returns an invalid
    field type, and succeeds when the LLM corrects it on the subsequent retry.
    """
    from src.application.ai_service import AIService

    tenant_id = uuid4()
    user_id = uuid4()
    ai_service = AIService()

    # Mock response 1: returns invalid 'markdown' field type
    response1 = MagicMock()
    response1.content = json.dumps({
        "name": "Article",
        "fields": [
            {"name": "body", "type": "markdown", "required": True, "label": "Body"}
        ]
    })

    # Mock response 2: returns corrected 'richText' field type
    response2 = MagicMock()
    response2.content = json.dumps({
        "name": "Article",
        "fields": [
            {"name": "body", "type": "richText", "required": True, "label": "Body"}
        ]
    })

    mock_llm = MagicMock()
    # first call returns response1, second call returns response2
    mock_llm.ainvoke = AsyncMock(side_effect=[response1, response2])

    with patch("src.application.ai_service.init_chat_model", return_value=mock_llm):
        result = await ai_service.generate_schema(
            prompt="create a model with markdown body",
            tenant_id=tenant_id,
            user_id=user_id
        )

        assert result["status"] == SessionStatus.COMPLETED
        assert result["schema"]["fields"][0]["type"] == "richText"
        # Verify ainvoke was called exactly twice (1 initial + 1 corrective loop)
        assert mock_llm.ainvoke.call_count == 2


@pytest.mark.asyncio
async def test_corrective_loop_raises_after_max_retries():
    """
    Verify that if the LLM keeps returning invalid field types even after 3 corrective feedback attempts,
    the generator raises a ValueError and marks the session as FAILED.
    """
    from src.application.ai_service import AIService

    tenant_id = uuid4()
    user_id = uuid4()
    ai_service = AIService()

    # Returns invalid field type consistently
    bad_response = MagicMock()
    bad_response.content = json.dumps({
        "name": "Article",
        "fields": [
            {"name": "body", "type": "unsupported_type", "required": True, "label": "Body"}
        ]
    })

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=bad_response)

    with patch("src.application.ai_service.init_chat_model", return_value=mock_llm):
        with pytest.raises(ValueError, match="Failed to generate a valid schema after 3 retries"):
            await ai_service.generate_schema(
                prompt="test persistent invalid schemas",
                tenant_id=tenant_id,
                user_id=user_id
            )

        # Check session transitioned to FAILED
        from src.application.ai_service import _sessions
        session = list(_sessions.values())[-1]
        assert session.status == SessionStatus.FAILED


# ── 3. FastAPI Endpoint Contract & Error Tests ──────────────────────────────

def test_endpoint_generate_schema_contract(client: TestClient):
    """Verify that POST /api/ai/generate-schema conforms to API contracts."""
    tenant_id = str(uuid4())
    user_id = str(uuid4())
    valid_schema = {
        "name": "Press Release",
        "fields": [{"name": "headline", "type": "text", "required": True, "label": "Headline"}]
    }

    with patch(
        "src.application.ai_service.AIService.generate_schema",
        new_callable=AsyncMock,
        return_value={
            "sessionId": "test-session-contract",
            "schema": valid_schema,
            "status": "completed"
        }
    ):
        response = client.post(
            "/api/ai/generate-schema",
            json={
                "prompt": "Press release with headline",
                "tenant_id": tenant_id,
                "user_id": user_id
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "content_schema" in data
        assert "status" in data
        assert data["content_schema"]["name"] == "Press Release"
        assert data["status"] == "completed"


def test_endpoint_generate_schema_validation_error_code(client: TestClient):
    """Verify that schema validation failures in corrective loop return a 422 error."""
    tenant_id = str(uuid4())
    user_id = str(uuid4())

    with patch(
        "src.application.ai_service.AIService.generate_schema",
        new_callable=AsyncMock,
        side_effect=ValueError("Failed to generate a valid schema after 3 retries")
    ):
        response = client.post(
            "/api/ai/generate-schema",
            json={
                "prompt": "invalid schema output trigger",
                "tenant_id": tenant_id,
                "user_id": user_id
            }
        )

        assert response.status_code == 422
        assert "detail" in response.json()
        assert "Failed to generate a valid schema after 3 retries" in response.json()["detail"]
