import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch
from src.application.refine_service import RefineService

@pytest.fixture
def mock_ai_service():
    return MagicMock()

@pytest.fixture
def refine_service(mock_ai_service):
    return RefineService(ai_service=mock_ai_service)

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
async def test_refine_draft_stream_yields_events(refine_service, mock_ai_service):
    mock_db = AsyncMock()
    
    mock_chunk1 = MagicMock(content="Refining content...\n```json\n", usage_metadata=None)
    mock_chunk2 = MagicMock(content='{"title": "Refined Hello World"}\n```', usage_metadata=None)
    
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
    async for event in refine_service.refine_draft_stream(
        prompt="Make it better",
        current_draft_json={"title": "Hello World"},
        schema_json={},
        tenant_id="tenant-1",
        user_id="user-1",
        db=mock_db,
        drafting_graph=mock_graph
    ):
        events.append(event)
    
    assert len(events) > 0
    assert any(e["event"] == "REFINE_COMPLETE" for e in events)

@pytest.mark.asyncio
async def test_refine_draft_with_style_modifier(refine_service, mock_ai_service):
    mock_db = AsyncMock()
    mock_chunk = MagicMock(content='{"title": "Styled Refined Content"}', usage_metadata=None)
    
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
    async for _ in refine_service.refine_draft_stream(
        prompt="Refine this",
        current_draft_json={"title": "Old"},
        schema_json={},
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
async def test_refine_draft_stream_tenant_mismatch(refine_service):
    mock_db = AsyncMock()
    mock_graph = MockDraftingGraph()
    
    # Pre-seed state with a different tenant ID
    mock_state_container = MagicMock()
    mock_state_container.values = {"tenant_id": "tenant-different"}
    mock_graph.aget_state = AsyncMock(return_value=mock_state_container)

    with pytest.raises(ValueError, match="Session does not belong to the active tenant context"):
        async for _ in refine_service.refine_draft_stream(
            prompt="Make it better",
            current_draft_json={"title": "Hello World"},
            schema_json={},
            tenant_id="tenant-active",
            user_id="user-1",
            db=mock_db,
            drafting_graph=mock_graph
        ):
            pass
