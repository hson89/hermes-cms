import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import AIMessage
from src.application.graphs.template_builder_graph import builder
from src.domain.template_builder.structures import TemplateBuilderOutput, PageTemplateDefinition, ContentTypeDefinition, ContentField

@pytest.fixture
def mock_llm():
    llm = MagicMock()
    # Mock with_structured_output to return a mock that returns our TemplateBuilderOutput
    structured_llm = AsyncMock()
    llm.with_structured_output.return_value = structured_llm
    
    output = TemplateBuilderOutput(
        templates=[
            PageTemplateDefinition(
                name="Aurelian Discovery",
                slug="aurelian-discovery",
                htmlContent="<html><body><h1>{{ title }}</h1></body></html>",
                contentType=ContentTypeDefinition(
                    name="Project",
                    slug="project",
                    fields=[
                        ContentField(name="title", type="text", label="Title", required=True)
                    ]
                )
            )
        ],
        explanation="Analyzing design for Aurelian Discovery."
    )
    structured_llm.ainvoke.return_value = output
    return llm

@pytest.fixture
def mock_cms_client():
    client = AsyncMock()
    client.upsert_content_type.return_value = {"id": "ct_123", "slug": "project"}
    client.upsert_page_template.return_value = {"id": "tpl_456", "slug": "aurelian-discovery"}
    return client

@pytest.mark.asyncio
async def test_template_builder_graph_success(mock_llm, mock_cms_client):
    # Compile graph with MemorySaver (mocked or real)
    from langgraph.checkpoint.memory import MemorySaver
    graph = builder.compile(checkpointer=MemorySaver())
    
    initial_state = {
        "design_html": "<html><body><h1>Sample</h1></body></html>",
        "tenant_id": "tenant_1",
        "user_id": "user_1",
        "templates": [],
        "errors": [],
        "retry_count": 0,
        "cms_results": [],
        "messages": []
    }
    
    config = {
        "configurable": {
            "ai_service": MagicMock(get_model=lambda **kwargs: mock_llm),
            "cms_client": mock_cms_client,
            "thread_id": "test_thread"
        }
    }
    
    final_state = await graph.ainvoke(initial_state, config=config)
    
    assert not final_state.get("errors")
    assert len(final_state["templates"]) == 1
    assert final_state["templates"][0]["slug"] == "aurelian-discovery"
    assert len(final_state["cms_results"]) == 1
    assert final_state["cms_results"][0]["templateId"] == "tpl_456"
    assert not final_state["errors"]
    
    # Verify CMS client calls
    mock_cms_client.upsert_content_type.assert_called_once()
    mock_cms_client.upsert_page_template.assert_called_once()
