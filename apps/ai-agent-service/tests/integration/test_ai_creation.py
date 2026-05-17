"""
Integration tests for the AI content creation flow.

T013 - Integration test for AI content creation flow (US1)

These tests use FastAPI's TestClient to test the full request/response cycle
without spinning up a real LLM. LangChain's LLM is mocked to avoid API costs
and enable deterministic CI runs.

TDD: These tests were written BEFORE the implementation, so they should
     initially FAIL and pass once T016-T018 are complete.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.main import app

# ── Fixtures ──────────────────────────────────────────────────────────────────

TENANT_ID = str(uuid4())
USER_ID = str(uuid4())

MOCK_SCHEMA = {
    "name": "Blog Post",
    "fields": [
        {"name": "title", "type": "text", "required": True, "label": "Title"},
        {"name": "body", "type": "richText", "required": True, "label": "Body"},
        {"name": "publishedAt", "type": "date", "required": False, "label": "Published At"},
    ],
}


@pytest.fixture()
def client() -> TestClient:
    """Return a TestClient for the FastAPI app with lifespan events enabled."""
    # Using a context manager ensures the lifespan (startup/shutdown) runs,
    # which initialises app.state.ai_service.
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def mock_llm_response() -> MagicMock:
    """Return a mock LangChain response that yields MOCK_SCHEMA JSON."""
    response = MagicMock()
    response.content = json.dumps(MOCK_SCHEMA)
    return response


# ── Tests ─────────────────────────────────────────────────────────────────────


class TestHealthEndpoint:
    """Basic sanity check that the service is running."""

    def test_health_returns_ok(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestGenerateSchemaEndpoint:
    """Integration tests for POST /api/ai/generate-schema."""

    def test_generate_schema_returns_200_with_valid_schema(
        self,
        client: TestClient,
        mock_llm_response: MagicMock,
    ) -> None:
        """Happy path: valid prompt returns a generated schema."""
        with patch(
            "src.application.ai_service.AIService.__init__",
            return_value=None,
        ), patch(
            "src.application.ai_service.AIService.generate_schema",
            new_callable=AsyncMock,
            return_value={
                "sessionId": "test-session-id",
                "schema": MOCK_SCHEMA,
                "status": "completed",
            },
        ):
            response = client.post(
                "/api/ai/generate-schema",
                json={
                    "prompt": "Create a blog post schema with title, body, and publication date",
                    "tenant_id": TENANT_ID,
                    "user_id": USER_ID,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "content_schema" in data
        assert data["content_schema"]["name"] == "Blog Post"
        assert len(data["content_schema"]["fields"]) == 3

    def test_generate_schema_rejects_empty_prompt(
        self,
        client: TestClient,
    ) -> None:
        """An empty prompt should result in a 422 validation error."""
        response = client.post(
            "/api/ai/generate-schema",
            json={
                "prompt": "",
                "tenant_id": TENANT_ID,
                "user_id": USER_ID,
            },
        )
        # FastAPI validates the body; service layer also validates
        assert response.status_code in (422, 400)

    def test_generate_schema_requires_tenant_id(
        self,
        client: TestClient,
    ) -> None:
        """Missing tenant_id should be rejected."""
        response = client.post(
            "/api/ai/generate-schema",
            json={"prompt": "A blog post schema"},
        )
        assert response.status_code == 422

    def test_generate_schema_session_is_stored(
        self,
        client: TestClient,
        mock_llm_response: MagicMock,
    ) -> None:
        """After generation, the session should be retrievable via GET /api/ai/sessions/{id}."""
        session_id = str(uuid4())

        with patch(
            "src.application.ai_service.AIService.__init__",
            return_value=None,
        ), patch(
            "src.application.ai_service.AIService.generate_schema",
            new_callable=AsyncMock,
            return_value={
                "sessionId": session_id,
                "schema": MOCK_SCHEMA,
                "status": "completed",
            },
        ), patch(
            "src.application.ai_service.AIService.get_session",
            new_callable=AsyncMock,
            return_value=MagicMock(
                id=session_id,
                status="completed",
                tenant_id=TENANT_ID,
                user_id=USER_ID,
                context=[],
                created_at=MagicMock(isoformat=lambda: "2026-05-09T00:00:00Z"),
                updated_at=MagicMock(isoformat=lambda: "2026-05-09T00:01:00Z"),
            ),
        ):
            gen_resp = client.post(
                "/api/ai/generate-schema",
                json={
                    "prompt": "Blog post schema",
                    "tenant_id": TENANT_ID,
                    "user_id": USER_ID,
                },
            )
            assert gen_resp.status_code == 200
            returned_session_id = gen_resp.json()["session_id"]

            session_resp = client.get(f"/api/ai/sessions/{returned_session_id}")
            assert session_resp.status_code == 200

    def test_generate_schema_llm_json_error_returns_422(
        self,
        client: TestClient,
    ) -> None:
        """If the LLM returns non-JSON, the service raises ValueError -> 422."""
        with patch(
            "src.application.ai_service.AIService.__init__",
            return_value=None,
        ), patch(
            "src.application.ai_service.AIService.generate_schema",
            new_callable=AsyncMock,
            side_effect=ValueError("LLM returned non-JSON output"),
        ):
            response = client.post(
                "/api/ai/generate-schema",
                json={
                    "prompt": "Some prompt",
                    "tenant_id": TENANT_ID,
                    "user_id": USER_ID,
                },
            )
        assert response.status_code == 422


class TestCopilotEditEndpoint:
    """Integration tests for POST /api/ai/copilot/edit."""

    def test_copilot_edit_returns_edited_content(
        self,
        client: TestClient,
    ) -> None:
        """Happy path: valid edit request returns revised content."""
        with patch(
            "src.application.copilot_service.CopilotService.edit_section",
            new_callable=AsyncMock,
            return_value="This is the more formal version of the paragraph.",
        ):
            response = client.post(
                "/api/ai/copilot/edit",
                json={
                    "content_item_id": str(uuid4()),
                    "section_id": "block-123",
                    "prompt": "Make this paragraph more formal.",
                    "tenant_id": TENANT_ID,
                    "user_id": USER_ID,
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert "section_id" in data


class TestSessionEndpoint:
    """Tests for GET /api/ai/sessions/{session_id}."""

    def test_get_nonexistent_session_returns_404(
        self,
        client: TestClient,
    ) -> None:
        """Requesting an unknown session ID should return 404."""
        response = client.get("/api/ai/sessions/does-not-exist")
        assert response.status_code == 404
