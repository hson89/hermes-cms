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

    def test_generate_schema_accepts_numeric_ids(
        self,
        client: TestClient,
    ) -> None:
        """Numeric user_id and tenant_id should be accepted and coerced to string."""
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
        ) as mock_gen:
            response = client.post(
                "/api/ai/generate-schema",
                json={
                    "prompt": "Create a blog post schema",
                    "tenant_id": 415,
                    "user_id": 30,
                },
            )
        assert response.status_code == 200
        # Verify arguments passed to the service layer were coerced to strings
        kwargs = mock_gen.call_args[1]
        assert kwargs["prompt"] == "Create a blog post schema"
        assert kwargs["tenant_id"] == "415"
        assert kwargs["user_id"] == "30"


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

    def test_copilot_edit_accepts_numeric_ids(
        self,
        client: TestClient,
    ) -> None:
        """Numeric IDs in copilot edit request should be accepted and coerced to string."""
        with patch(
            "src.application.copilot_service.CopilotService.edit_section",
            new_callable=AsyncMock,
            return_value="This is the edited paragraph.",
        ) as mock_edit:
            response = client.post(
                "/api/ai/copilot/edit",
                json={
                    "content_item_id": 12345,
                    "section_id": 67890,
                    "prompt": "Make this paragraph more formal.",
                    "tenant_id": 415,
                    "user_id": 30,
                },
            )
        assert response.status_code == 200
        mock_edit.assert_called_once_with(
            content_item_id="12345",
            section_id="67890",
            prompt="Make this paragraph more formal.",
            tenant_id="415",
            user_id="30",
            langfuse_trace_id=None,
        )


class TestSessionEndpoint:
    """Tests for GET /api/ai/sessions/{session_id}."""

    def test_get_nonexistent_session_returns_404(
        self,
        client: TestClient,
    ) -> None:
        """Requesting an unknown session ID should return 404."""
        response = client.get("/api/ai/sessions/does-not-exist")
        assert response.status_code == 404


class TestSessionStreamingEndpoint:
    """Integration tests for POST /api/ai/sessions/{session_id}/message (US2)."""

    def test_session_message_streams_events(
        self,
        client: TestClient,
    ) -> None:
        """Verify that sending a message returns a 200 SSE stream yielding AG-UI events."""
        session_id = str(uuid4())

        async def mock_generator(*args, **kwargs):
            yield {"event": "STATUS_UPDATE", "data": "generating"}
            yield {"event": "TEXT_DELTA", "data": "Adding field"}
            yield {"event": "STATE_DELTA", "data": {"name": "Watch", "fields": []}}
            yield {"event": "STATUS_UPDATE", "data": "completed"}

        with patch(
            "src.application.ai_service.AIService.continue_generation_session_stream",
            return_value=mock_generator(),
        ):
            response = client.post(
                f"/api/ai/sessions/{session_id}/message",
                json={
                    "prompt": "add price field",
                    "current_schema": {"name": "Watch", "fields": []}
                },
            )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        
        lines = response.text.strip().split("\n")
        lines = [line for line in lines if line]
        
        assert "event: STATUS_UPDATE" in lines[0]
        assert 'data: "generating"' in lines[1]
        assert "event: TEXT_DELTA" in lines[2]
        assert 'data: "Adding field"' in lines[3]
        assert "event: STATE_DELTA" in lines[4]
        assert 'data: {"name": "Watch", "fields": []}' in lines[5]
        assert "event: STATUS_UPDATE" in lines[6]
        assert 'data: "completed"' in lines[7]

    def test_session_message_rejects_empty_prompt(
        self,
        client: TestClient,
    ) -> None:
        """Reject empty prompts with 422 validation error."""
        response = client.post(
            f"/api/ai/sessions/some-id/message",
            json={"prompt": ""},
        )
        assert response.status_code == 422


class TestRefineEndpoint:
    """Integration tests for POST /api/ai/refine."""

    def test_refine_draft_returns_stream(
        self,
        client: TestClient,
    ) -> None:
        """Verify that refining a draft streams events."""
        async def mock_generator(*args, **kwargs):
            yield {"event": "TEXT_DELTA", "data": "Refined paragraph"}
            yield {"event": "REFINE_COMPLETE", "data": {"draft": {"body": "Refined body"}}}

        with patch(
            "src.application.refine_service.RefineService.refine_draft_stream",
            return_value=mock_generator(),
        ):
            response = client.post(
                "/api/ai/refine",
                json={
                    "prompt": "make it formal",
                    "current_draft_json": {"body": "original body"},
                    "content_schema": {},
                    "tenant_id": TENANT_ID,
                    "user_id": USER_ID,
                    "session_id": "test-session-id",
                },
            )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    def test_refine_draft_coerces_numeric_session_id(
        self,
        client: TestClient,
    ) -> None:
        """Verify that numeric session_id (like 10) is coerced to a string."""
        async def mock_generator(*args, **kwargs):
            yield {"event": "REFINE_COMPLETE", "data": {"draft": {}}}

        with patch(
            "src.application.refine_service.RefineService.refine_draft_stream",
            return_value=mock_generator(),
        ) as mock_refine:
            response = client.post(
                "/api/ai/refine",
                json={
                    "prompt": "make it formal",
                    "current_draft_json": {},
                    "content_schema": {},
                    "tenant_id": TENANT_ID,
                    "user_id": USER_ID,
                    "session_id": 10,
                },
            )

        assert response.status_code == 200
        # Verify the coerced session_id was passed to the service layer as a string
        kwargs = mock_refine.call_args[1]
        assert kwargs["session_id"] == "10"

