import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from src.application.drafting_service import DraftingService

@pytest.fixture
def mock_ai_service():
    return MagicMock()

@pytest.fixture
def drafting_service(mock_ai_service):
    return DraftingService(ai_service=mock_ai_service)

@pytest.mark.asyncio
async def test_generate_draft_stream_yields_events(drafting_service, mock_ai_service):
    # Mock internal astream behavior
    mock_model = MagicMock()
    mock_db = AsyncMock()
    
    mock_chunk1 = MagicMock()
    mock_chunk1.content = "Thought: I should start with a title."
    mock_chunk2 = MagicMock()
    mock_chunk2.content = ' {"title": "Hello World", "slug": "hello-world", "body": "This is a test."}'
    
    async def mock_astream(*args, **kwargs):
        yield mock_chunk1
        yield mock_chunk2
        
    mock_ai_service.get_model.return_value = mock_model

    # Patch the prompt | model chain behavior
    with patch("src.application.drafting_service.DRAFTING_PROMPT", new=MagicMock()) as mock_prompt, \
         patch("src.application.drafting_service.SQLSessionRepository", autospec=True) as mock_repo_class:
        
        mock_repo = mock_repo_class.return_value
        mock_repo.get_by_id.return_value = None
        mock_repo.save = AsyncMock()

        mock_chain = MagicMock()
        mock_chain.astream = mock_astream
        mock_prompt.__or__.return_value = mock_chain

        events = []
        async for event in drafting_service.generate_draft_stream(
            prompt="Write a blog post about AI",
            content_type_slug="blog-posts",
            schema_json={},
            tenant_id="tenant-1",
            user_id="user-1",
            db=mock_db
        ):
            events.append(event)
    
    for event in events:
        print(f"DEBUG: Event: {event['event']}")
        if event['event'] == 'ERROR':
            print(f"DEBUG: Error Data: {event['data']}")
    
    assert len(events) > 0
    assert events[0]["event"] == "TEXT_DELTA"
    # The last event should be DRAFT_COMPLETE because the chunks combined form a valid JSON
    assert any(e["event"] == "DRAFT_COMPLETE" for e in events)
