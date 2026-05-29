import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from src.application.drafting_service import DraftingService

@pytest.fixture
def mock_ai_service():
    return MagicMock()

@pytest.fixture
def drafting_service(mock_ai_service):
    return DraftingService(ai_service=mock_ai_service)

class MockDraftingGraph:
    def __init__(self, events=None):
        self.aget_state = AsyncMock(return_value=None)
        self.aupdate_state = AsyncMock()
        self.events = events or []
        self.called_inputs = None
        self.called_config = None

    async def astream_events(self, inputs, config=None, version="v2"):
        self.called_inputs = inputs
        self.called_config = config
        for event in self.events:
            yield event

@pytest.mark.asyncio
async def test_generate_draft_stream_yields_events(drafting_service, mock_ai_service):
    mock_db = AsyncMock()
    
    mock_chunk1 = MagicMock(content="Thought: I should start with a title.", usage_metadata=None)
    mock_chunk2 = MagicMock(content='\n```json\n{"title": "Hello World", "slug": "hello-world", "body": "This is a test."}\n```', usage_metadata=None)
    
    events_list = [
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "call_drafting_llm"},
            "data": {"chunk": mock_chunk1}
        },
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "call_drafting_llm"},
            "data": {"chunk": mock_chunk2}
        }
    ]
    mock_graph = MockDraftingGraph(events_list)

    events = []
    async for event in drafting_service.generate_draft_stream(
        prompt="Write a blog post about AI",
        content_type_slug="blog-posts",
        schema_json={"fields": [{"name": "title", "type": "text"}]},
        tenant_id="tenant-1",
        user_id="user-1",
        db=mock_db,
        drafting_graph=mock_graph
    ):
        events.append(event)
    
    assert len(events) > 0
    assert events[0]["event"] == "TEXT_DELTA"
    assert any(e["event"] == "DRAFT_COMPLETE" for e in events)

@pytest.mark.asyncio
async def test_generate_draft_with_style_modifier(drafting_service, mock_ai_service):
    mock_db = AsyncMock()
    mock_chunk = MagicMock(content='{"title": "Styled Content"}', usage_metadata=None)
    
    events_list = [
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "call_drafting_llm"},
            "data": {"chunk": mock_chunk}
        }
    ]
    mock_graph = MockDraftingGraph(events_list)

    style_prompt = "Make it sound like a pirate."
    
    events = []
    async for _ in drafting_service.generate_draft_stream(
        prompt="Hello",
        content_type_slug="post",
        schema_json={"fields": [{"name": "title", "type": "text"}]},
        tenant_id="t1",
        user_id="u1",
        db=mock_db,
        style_modifier_prompt=style_prompt,
        drafting_graph=mock_graph
    ):
        pass
    
    assert mock_graph.called_inputs is not None
    assert mock_graph.called_inputs["style_modifier_prompt"] == style_prompt

@pytest.mark.asyncio
async def test_generate_draft_stream_bootstrap_flow(drafting_service, mock_ai_service):
    mock_db = AsyncMock()
    mock_ai_service.generate_schema = AsyncMock()

    mock_model = MagicMock()
    mock_match_res = MagicMock(content="NONE")
    mock_model.ainvoke = AsyncMock(return_value=mock_match_res)
    mock_ai_service.get_model.return_value = mock_model

    class MockResponse:
        def __init__(self, json_data, status_code):
            self._json = json_data
            self.status_code = status_code
        def json(self):
            return self._json
        @property
        def text(self):
            return json.dumps(self._json)

    with patch("httpx.AsyncClient", autospec=True) as mock_client_class:
        
        mock_client = mock_client_class.return_value.__aenter__.return_value
        mock_client.get = AsyncMock(return_value=MockResponse({"docs": []}, 200))

        events = []
        async for event in drafting_service.generate_draft_stream(
            prompt="create a contact form",
            content_type_slug=None,
            schema_json=None,
            tenant_id="tenant-123",
            user_id="user-123",
            db=mock_db
        ):
            events.append(event)

    mock_ai_service.generate_schema.assert_not_called()
    assert any(e["event"] == "TEXT_DELTA" for e in events)
    warning_event = next(e for e in events if e["event"] == "TEXT_DELTA" and "I couldn't find a matching content type" in e["data"])
    assert warning_event is not None
    assert not any(e["event"] == "SCHEMA_UPDATED" for e in events)
    assert not any(e["event"] == "DRAFT_COMPLETE" for e in events)

@pytest.mark.asyncio
async def test_generate_draft_stream_bootstrap_flow_with_matching(drafting_service, mock_ai_service):
    mock_db = AsyncMock()

    mock_model = MagicMock()
    mock_match_res = MagicMock()
    mock_match_res.content = "existing-article"
    mock_model.ainvoke = AsyncMock(return_value=mock_match_res)
    mock_ai_service.get_model.return_value = mock_model

    mock_chunk1 = MagicMock(content="Thought: Drafting article...", usage_metadata=None)
    mock_chunk2 = MagicMock(content='\n```json\n{"title": "Matched Fuel Saving Info", "slug": "matched-fuel-saving", "body": "matched content"}\n```', usage_metadata=None)
    
    events_list = [
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "call_drafting_llm"},
            "data": {"chunk": mock_chunk1}
        },
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "call_drafting_llm"},
            "data": {"chunk": mock_chunk2}
        }
    ]
    mock_graph = MockDraftingGraph(events_list)

    class MockResponse:
        def __init__(self, json_data, status_code):
            self._json = json_data
            self.status_code = status_code
        def json(self):
            return self._json
        @property
        def text(self):
            return json.dumps(self._json)

    with patch("httpx.AsyncClient", autospec=True) as mock_client_class:
        
        mock_client = mock_client_class.return_value.__aenter__.return_value
        mock_client.get = AsyncMock(return_value=MockResponse({
            "docs": [
                {
                    "id": "existing-ct-id",
                    "name": "Editorial Article",
                    "slug": "existing-article",
                    "schema": {
                        "name": "Editorial Article",
                        "slug": "existing-article",
                        "fields": [
                            {"name": "title", "type": "text"},
                            {"name": "slug", "type": "text"},
                            {"name": "body", "type": "text"}
                        ]
                    }
                }
            ]
        }, 200))

        events = []
        async for event in drafting_service.generate_draft_stream(
            prompt="write an article about saving fuel",
            content_type_slug=None,
            schema_json=None,
            tenant_id="tenant-123",
            user_id="user-123",
            db=mock_db,
            drafting_graph=mock_graph
        ):
            events.append(event)

    mock_ai_service.generate_schema.assert_not_called()
    assert any("Reusing existing" in e.get("data", "") for e in events if e["event"] == "TEXT_DELTA")
    assert any(e["event"] == "SCHEMA_UPDATED" for e in events)
    schema_event = next(e for e in events if e["event"] == "SCHEMA_UPDATED")
    assert schema_event["data"]["contentType"]["id"] == "existing-ct-id"
    assert schema_event["data"]["contentType"]["slug"] == "existing-article"
    assert any(e["event"] == "DRAFT_COMPLETE" for e in events)
    draft_event = next(e for e in events if e["event"] == "DRAFT_COMPLETE")
    assert draft_event["data"]["draft"]["title"] == "Matched Fuel Saving Info"

@pytest.mark.asyncio
async def test_generate_draft_stream_self_healing(drafting_service, mock_ai_service):
    mock_db = AsyncMock()
    mock_model = MagicMock()
    mock_ai_service.get_model.return_value = mock_model

    mock_healed_res = MagicMock(content='{"title": "Saving Fuel Healed", "body": "healed content"}')
    mock_model.ainvoke = AsyncMock(return_value=mock_healed_res)

    mock_chunk = MagicMock(content="Thought: Generating...\n```json\n{\n  \"title\": \"Saving Fuel\" (malformed JSON)\n", usage_metadata=None)
    
    events_list = [
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "call_drafting_llm"},
            "data": {"chunk": mock_chunk}
        }
    ]
    mock_graph = MockDraftingGraph(events_list)

    events = []
    async for event in drafting_service.generate_draft_stream(
        prompt="write an article about saving fuel",
        content_type_slug="articles",
        schema_json={"fields": [{"name": "title", "type": "text"}, {"name": "body", "type": "text"}]},
        tenant_id="tenant-123",
        user_id="user-123",
        db=mock_db,
        drafting_graph=mock_graph
    ):
        events.append(event)

    mock_model.ainvoke.assert_called()
    assert any(e["event"] == "DRAFT_COMPLETE" for e in events)
    draft_event = next(e for e in events if e["event"] == "DRAFT_COMPLETE")
    assert draft_event["data"]["draft"]["title"] == "Saving Fuel Healed"
    assert draft_event["data"]["draft"]["body"] == "healed content"

@pytest.mark.asyncio
async def test_generate_draft_stream_conversational_no_healing(drafting_service, mock_ai_service):
    mock_db = AsyncMock()
    mock_model = MagicMock()
    mock_ai_service.get_model.return_value = mock_model

    mock_chunk = MagicMock(content="Hello! This is purely conversational text. No JSON here.", usage_metadata=None)
    
    events_list = [
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "call_drafting_llm"},
            "data": {"chunk": mock_chunk}
        }
    ]
    mock_graph = MockDraftingGraph(events_list)

    events = []
    async for event in drafting_service.generate_draft_stream(
        prompt="hello there",
        content_type_slug="articles",
        schema_json={"fields": [{"name": "title", "type": "text"}]},
        tenant_id="tenant-123",
        user_id="user-123",
        db=mock_db,
        drafting_graph=mock_graph
    ):
        events.append(event)

    mock_model.ainvoke.assert_not_called()
    assert not any(e["event"] == "DRAFT_COMPLETE" for e in events)

@pytest.mark.asyncio
async def test_generate_draft_stream_tenant_mismatch(drafting_service, mock_ai_service):
    mock_db = AsyncMock()
    mock_graph = MockDraftingGraph([])
    
    mock_state_container = MagicMock()
    mock_state_container.values = {"tenant_id": "tenant-other"}
    mock_graph.aget_state.return_value = mock_state_container
    
    with pytest.raises(ValueError, match="Session does not belong to the active tenant context"):
        async for _ in drafting_service.generate_draft_stream(
            prompt="write an article about saving fuel",
            content_type_slug="articles",
            schema_json={"fields": [{"name": "title", "type": "text"}]},
            tenant_id="tenant-my",
            user_id="user-123",
            db=mock_db,
            session_id="session-123",
            drafting_graph=mock_graph
        ):
            pass

