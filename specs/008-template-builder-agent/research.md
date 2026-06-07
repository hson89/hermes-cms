# Research & Technical Decisions: Template Builder Agent

This document outlines the architectural decisions, data structures, and integration patterns for implementing the Template Builder Agent.

## Decisions

### 1. LangGraph State Schema (`TemplateBuilderState`)

The Template Builder Agent will use a custom LangGraph workflow. The state schema will track the input HTML, generated outputs, validation errors, and retry logs:

```python
from typing import Annotated, Any, Dict, List, Optional, TypedDict
import operator
from langchain_core.messages import BaseMessage

class TemplateBuilderState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    html_design: str
    tenant_id: str
    user_id: str
    session_id: str
    available_blocks: List[Dict[str, Any]]
    
    # Generated Outputs
    generated_schema: Optional[Dict[str, Any]]  # Content Type schema
    generated_template: Optional[Dict[str, Any]]  # Page Template configuration
    explanation: Optional[str]
    
    # Error Handling & Self-Correction
    errors: List[str]
    retry_count: int
```

### 2. LLM Structured Output Model (`TemplateBuilderOutput`)

To ensure the LLM yields a clean, parseable structure, we define a Pydantic schema for the LLM output:

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class FieldDefinition(BaseModel):
    name: str = Field(..., description="Unique snake_case identifier for the field (e.g., hero_title)")
    type: str = Field(..., description="Field type: text, textarea, richText, number, checkbox, upload (for media)")
    label: str = Field(..., description="Human-readable label for the editor form")
    required: bool = Field(False, description="Is this field mandatory?")
    description: Optional[str] = Field(None, description="Helpful tooltip text for the field")

class BlockMapping(BaseModel):
    instanceId: str = Field(..., description="Unique random string for this block instance")
    block_slug: str = Field(..., description="Slug of the building block to map to (e.g. hero-block)")
    mappings: Dict[str, str] = Field(..., description="Map block property keys to Content Type field names (e.g., {'title': 'hero_title'})")

class TemplateBuilderOutput(BaseModel):
    schema_name: str = Field(..., description="Display name for the Content Type (e.g., Home Landing Page)")
    schema_slug: str = Field(..., description="Unique slug for the Content Type (e.g., home-landing-page)")
    fields: List[FieldDefinition] = Field(..., description="Fields matching the dynamic variables of the template")
    template_name: str = Field(..., description="Name for the Page Template (e.g., Home Template)")
    template_slug: str = Field(..., description="Unique slug for the Page Template (e.g., home-template)")
    parameterized_html: str = Field(..., description="The original HTML code with dynamic parts replaced by double curly brace variables, e.g., {{ hero_title }}")
    layout_mappings: List[BlockMapping] = Field(default=[], description="List of block mappings to register in the Page Template layout")
    explanation: str = Field(..., description="Detailed explanation of the extraction choices")
```

### 3. CMS Client Integration (FastAPI -> Payload CMS)

To enable the agent to query/create/update collection entries in Payload CMS, we extend `CMSClient` in the `infrastructure/clients` layer:

- `fetch_building_blocks(tenant_id)`: Retrieves available blocks for context in mapping.
- `create_or_update_content_type(tenant_id, schema_data)`: Checks if a ContentType with `slug` exists for the tenant. If yes, updates it; if no, creates it.
- `create_or_update_page_template(tenant_id, template_data)`: Checks if a PageTemplate with `slug` exists for the tenant. If yes, updates it; if no, creates it.

### 4. Direct MCP Tool Integration

We will add a new MCP tool `convert_html_to_template` to the `content-authoring-service` FastMCP server:

```python
@mcp.tool()
async def convert_html_to_template(
    html_design: str,
    session_id: Optional[str] = None
) -> Any:
    """
    Parses a raw HTML design, generates/updates a matching Content Type schema, 
    and registers a Page Template inside the CMS under the authenticated tenant's namespace.
    """
```

### 5. Caching, Relational Queries, and Process Stability Decisions

- **Cache-Busting Strategy**: The agent must automatically generate a unique hash for any visual assets uploaded to the CMS media library during template creation. The filenames will follow the pattern `[original_name]_[hash].[ext]` to bypass any CDN or browser cache.
- **Relational Null Mapping**: All Payload collection queries targeting global assets (such as global page templates or shared media assets with `tenant: null`) must utilize the `{ equals: null }` operator rather than `{ exists: false }` to prevent PostgreSQL execution crashes.
- **Visual Asset Overlap Prevention**: The client will compute MD5/SHA256 checksums of any downloaded or generated images before registration, rejecting duplicate media uploads to minimize storage layout noise.
- **Process Terminations**: Next.js and Payload CMS local execution will explicitly destroy database client pools in lifecycle events to prevent background task locks in terminal runners.

## Alternatives Considered

- **Inline Parsing (Regex)**: Considered parsing HTML using regular expression or BeautifulSoup rules in python before calling LLM. **Rejected** because visual and layout context is lost, and LLMs are far better at inferring semantic fields (e.g., distinguishing a subtitle from a description) by looking at the HTML layout holistically.
- **Separate Endpoints for Schema and Template**: Considered making this a multi-step API. **Rejected** because a single-transaction graph guarantees atomicity: the Page Template cannot exist without its associated Content Type, so registering them together avoids orphan states.
