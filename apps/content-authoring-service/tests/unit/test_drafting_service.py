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
    mock_model_with_tools = MagicMock()
    mock_db = AsyncMock()
    
    mock_chunk1 = MagicMock()
    mock_chunk1.content = "Thought: I should start with a title."
    mock_chunk2 = MagicMock()
    mock_chunk2.content = ' {"title": "Hello World", "slug": "hello-world", "body": "This is a test."}'
    
    async def mock_astream(*args, **kwargs):
        yield mock_chunk1
        yield mock_chunk2
        
    mock_ai_service.get_model.return_value = mock_model
    mock_model.bind_tools.return_value = mock_model_with_tools
    mock_model_with_tools.astream = MagicMock(side_effect=mock_astream)

    # Patch the repository behavior
    with patch("src.application.drafting_service.SQLSessionRepository", autospec=True) as mock_repo_class:
        
        mock_repo = mock_repo_class.return_value
        mock_repo.get_by_id.return_value = None
        mock_repo.save = AsyncMock()

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
    mock_model_with_tools = MagicMock()
    mock_db = AsyncMock()
    
    mock_chunk = MagicMock()
    mock_chunk.content = '{"title": "Styled Content"}'
    
    async def mock_astream(*args, **kwargs):
        yield mock_chunk
        
    mock_ai_service.get_model.return_value = mock_model
    mock_model.bind_tools.return_value = mock_model_with_tools
    mock_model_with_tools.astream = MagicMock(side_effect=mock_astream)

    with patch("src.application.drafting_service.SQLSessionRepository", autospec=True) as mock_repo_class:
        
        mock_repo = mock_repo_class.return_value
        mock_repo.get_by_id.return_value = None
        mock_repo.save = AsyncMock()

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
        
        # Verify that astream was called
        mock_model_with_tools.astream.assert_called()


@pytest.mark.asyncio
async def test_generate_draft_stream_bootstrap_flow(drafting_service, mock_ai_service):
    """
    Verify that when content_type_slug or schema_json is missing (bootstrap flow),
    the generator checks for existing schemas, generates a new schema, registers it in Payload CMS,
    and then falls through to stream the actual draft content from the LLM drafting chain.
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

    # Mock the LangChain LLM used for matching and drafting
    mock_model = MagicMock()
    mock_model_with_tools = MagicMock()
    
    mock_match_res = MagicMock()
    mock_match_res.content = "NONE" # No matching content type
    
    mock_chunk1 = MagicMock()
    mock_chunk1.content = "Thought: Drafting contact form..."
    mock_chunk2 = MagicMock()
    mock_chunk2.content = ' {"fullName": "John Doe", "consent": true, "phone": 1234567}'
    
    async def mock_astream(*args, **kwargs):
        yield mock_chunk1
        yield mock_chunk2
        
    mock_ai_service.get_model.return_value = mock_model
    mock_model.ainvoke = AsyncMock(return_value=mock_match_res)
    mock_model.bind_tools.return_value = mock_model_with_tools
    mock_model_with_tools.astream = MagicMock(side_effect=mock_astream)

    # Mock HTTP client responses
    class MockResponse:
        def __init__(self, json_data, status_code):
            self._json = json_data
            self.status_code = status_code
        def json(self):
            return self._json
        @property
        def text(self):
            return json.dumps(self._json)

    # Mock the database repository and httpx client
    with patch("src.application.drafting_service.SQLSessionRepository", autospec=True) as mock_repo_class, \
         patch("httpx.AsyncClient", autospec=True) as mock_client_class:
        
        mock_repo = mock_repo_class.return_value
        mock_repo.get_by_id.return_value = None
        mock_repo.save = AsyncMock()

        mock_client = mock_client_class.return_value.__aenter__.return_value
        mock_client.get = AsyncMock(return_value=MockResponse({"docs": []}, 200))
        mock_client.post = AsyncMock(return_value=MockResponse({
            "id": "mock-ct-id",
            "name": "Contact Form",
            "slug": "contact-form",
            "schema": {
                "name": "Contact Form",
                "slug": "contact-form",
                "fields": [
                    {"name": "fullName", "type": "text", "label": "Full Name"},
                    {"name": "consent", "type": "boolean", "label": "Consent"},
                    {"name": "phone", "type": "number", "label": "Phone"}
                ]
            }
        }, 201))

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

    # 1. Assert generate_schema was called
    mock_ai_service.generate_schema.assert_called_once_with(
        prompt="create a contact form",
        tenant_id="tenant-123",
        user_id="user-123",
        current_schema=None,
        db=mock_db
    )

    # 2. Verify events
    assert any(e["event"] == "SCHEMA_UPDATED" for e in events)
    schema_event = next(e for e in events if e["event"] == "SCHEMA_UPDATED")
    assert schema_event["data"]["contentType"]["id"] == "mock-ct-id"
    assert schema_event["data"]["contentType"]["name"] == "Contact Form"
    
    assert any(e["event"] == "DRAFT_COMPLETE" for e in events)
    draft_event = next(e for e in events if e["event"] == "DRAFT_COMPLETE")
    assert draft_event["data"]["draft"]["fullName"] == "John Doe"
    assert draft_event["data"]["draft"]["consent"] is True


@pytest.mark.asyncio
async def test_generate_draft_stream_bootstrap_flow_with_matching(drafting_service, mock_ai_service):
    """
    Verify that when content_type_slug or schema_json is missing (bootstrap flow),
    and there is an existing content type matching the user prompt,
    the generator reuses it and falls through to stream the actual draft content.
    """
    mock_db = AsyncMock()

    # Mock the LangChain LLM used for matching and drafting
    mock_model = MagicMock()
    mock_model_with_tools = MagicMock()
    
    mock_match_res = MagicMock()
    mock_match_res.content = "existing-article" # Matched slug
    
    mock_chunk1 = MagicMock()
    mock_chunk1.content = "Thought: Drafting article..."
    mock_chunk2 = MagicMock()
    mock_chunk2.content = ' {"title": "Matched Fuel Saving Info", "slug": "matched-fuel-saving", "body": "matched content"}'
    
    async def mock_astream(*args, **kwargs):
        yield mock_chunk1
        yield mock_chunk2
        
    mock_ai_service.get_model.return_value = mock_model
    mock_model.ainvoke = AsyncMock(return_value=mock_match_res)
    mock_model.bind_tools.return_value = mock_model_with_tools
    mock_model_with_tools.astream = MagicMock(side_effect=mock_astream)

    # Mock HTTP client responses
    class MockResponse:
        def __init__(self, json_data, status_code):
            self._json = json_data
            self.status_code = status_code
        def json(self):
            return self._json
        @property
        def text(self):
            return json.dumps(self._json)

    # Mock the database repository and httpx client
    with patch("src.application.drafting_service.SQLSessionRepository", autospec=True) as mock_repo_class, \
         patch("httpx.AsyncClient", autospec=True) as mock_client_class:
        
        mock_repo = mock_repo_class.return_value
        mock_repo.get_by_id.return_value = None
        mock_repo.save = AsyncMock()

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
            db=mock_db
        ):
            events.append(event)

    # SCHEMA GENERATION should NOT be called since a match was found!
    mock_ai_service.generate_schema.assert_not_called()

    # 1. Verify match reused
    assert any("Reusing existing" in e.get("data", "") for e in events if e["event"] == "TEXT_DELTA")
    
    # 2. Verify schema event
    assert any(e["event"] == "SCHEMA_UPDATED" for e in events)
    schema_event = next(e for e in events if e["event"] == "SCHEMA_UPDATED")
    assert schema_event["data"]["contentType"]["id"] == "existing-ct-id"
    assert schema_event["data"]["contentType"]["slug"] == "existing-article"
    
    # 3. Verify draft completed
    assert any(e["event"] == "DRAFT_COMPLETE" for e in events)
    draft_event = next(e for e in events if e["event"] == "DRAFT_COMPLETE")
    assert draft_event["data"]["draft"]["title"] == "Matched Fuel Saving Info"

