import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from src.application.refine_service import RefineService

@pytest.fixture
def mock_ai_service():
    return MagicMock()

@pytest.fixture
def refine_service(mock_ai_service):
    return RefineService(ai_service=mock_ai_service)

@pytest.mark.asyncio
async def test_refine_draft_stream_yields_events(refine_service, mock_ai_service):
    mock_model = MagicMock()
    mock_db = AsyncMock()
    
    mock_chunk1 = MagicMock()
    mock_chunk1.content = "Refining content..."
    mock_chunk2 = MagicMock()
    mock_chunk2.content = ' {"title": "Refined Hello World"}'
    
    async def mock_astream(*args, **kwargs):
        yield mock_chunk1
        yield mock_chunk2
        
    mock_ai_service.get_model.return_value = mock_model

    with patch("src.application.refine_service.REFINEMENT_PROMPT", new=MagicMock()) as mock_prompt, \
         patch("src.application.refine_service.SQLSessionRepository", autospec=True) as mock_repo_class:
        
        mock_repo = mock_repo_class.return_value
        mock_repo.get_by_id.return_value = None
        mock_repo.save = AsyncMock()

        mock_chain = MagicMock()
        mock_chain.astream = mock_astream
        mock_prompt.__or__.return_value = mock_chain

        events = []
        async for event in refine_service.refine_draft_stream(
            prompt="Make it better",
            current_draft_json={"title": "Hello World"},
            schema_json={},
            tenant_id="tenant-1",
            user_id="user-1",
            db=mock_db
        ):
            events.append(event)
    
    assert len(events) > 0
    assert any(e["event"] == "REFINE_COMPLETE" for e in events)
