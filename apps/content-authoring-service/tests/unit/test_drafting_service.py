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
        mock_chain.astream = MagicMock(side_effect=mock_astream)
        mock_prompt.__or__.return_value = mock_chain

        events = []
        async for event in drafting_service.generate_draft_stream(
            prompt="Write a blog post about AI",
            content_type_slug="blog-posts",
            schema_json={"fields": [{"name": "title", "type": "text"}]},
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

@pytest.mark.asyncio
async def test_generate_draft_with_style_modifier(drafting_service, mock_ai_service):
    mock_model = MagicMock()
    mock_db = AsyncMock()
    
    mock_chunk = MagicMock()
    mock_chunk.content = '{"title": "Styled Content"}'
    
    async def mock_astream(*args, **kwargs):
        yield mock_chunk
        
    mock_ai_service.get_model.return_value = mock_model

    with patch("src.application.drafting_service.DRAFTING_PROMPT", new=MagicMock()) as mock_prompt, \
         patch("src.application.drafting_service.SQLSessionRepository", autospec=True) as mock_repo_class:
        
        mock_repo = mock_repo_class.return_value
        mock_repo.get_by_id.return_value = None
        mock_repo.save = AsyncMock()

        mock_chain = MagicMock()
        mock_chain.astream = MagicMock(side_effect=mock_astream)
        mock_prompt.__or__.return_value = mock_chain

        style_prompt = "Make it sound like a pirate."
        
        async for _ in drafting_service.generate_draft_stream(
            prompt="Hello",
            content_type_slug="post",
            schema_json={"fields": [{"name": "title", "type": "text"}]},
            tenant_id="t1",
            user_id="u1",
            db=mock_db,
            style_modifier_prompt=style_prompt
        ):
            pass
        
        # Verify that style_modifier_instructions was passed to astream
        mock_chain.astream.assert_called_once()
        call_args = mock_chain.astream.call_args[0][0]
        assert call_args["style_modifier_instructions"] == style_prompt


@pytest.mark.asyncio
async def test_generate_draft_stream_bootstrap_flow(drafting_service, mock_ai_service):
    """
    Verify that when content_type_slug or schema_json is missing (bootstrap flow),
    the generator calls generate_schema, yields SCHEMA_UPDATED and DRAFT_COMPLETE with default values,
    and terminates early without running the drafting LLM chain.
    """
    mock_db = AsyncMock()
    mock_ai_service.generate_schema = AsyncMock(return_value={
        "schema": {
            "name": "Contact Form",
            "slug": "contact-form",
            "fields": [
                {"name": "fullName", "type": "text", "label": "Full Name"},
                {"name": "consent", "type": "boolean", "label": "Consent"},
                {"name": "phone", "type": "number", "label": "Phone"}
            ]
        },
        "sessionId": "123e4567-e89b-12d3-a456-426614174000",
        "message": "Schema co-created successfully."
    })

    # Verify that the LLM chains are NOT called
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

    # 1. Assert generate_schema was called with original prompt
    mock_ai_service.generate_schema.assert_called_once_with(
        prompt="create a contact form",
        tenant_id="tenant-123",
        user_id="user-123",
        current_schema=None,
        db=mock_db
    )

    # 2. Assert correct sequence of emitted events
    assert len(events) == 3
    
    # Event 1: Explanation delta
    assert events[0]["event"] == "TEXT_DELTA"
    assert "Schema co-created successfully." in events[0]["data"]

    # Event 2: SCHEMA_UPDATED with content type AND carry-over prompt
    assert events[1]["event"] == "SCHEMA_UPDATED"
    assert events[1]["data"]["contentType"]["name"] == "Contact Form"
    assert events[1]["data"]["prompt"] == "create a contact form"

    # Event 3: DRAFT_COMPLETE containing empty default structured draft
    assert events[2]["event"] == "DRAFT_COMPLETE"
    draft = events[2]["data"]["draft"]
    assert draft["fullName"] == ""
    assert draft["consent"] is False
    assert draft["phone"] is None
    # Standard fallback fields
    assert draft["title"] == ""
    assert draft["slug"] == ""
