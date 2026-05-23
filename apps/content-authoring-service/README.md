# Content Authoring Service — AI Microservice

The **Content Authoring Service** is the logical AI brain of the Hermes AI headless CMS platform. It is an independent FastAPI Python service built using strict **Domain-Driven Design (DDD)** principles and **LangChain 1.2+**. 

The microservice handles structured schema generation, real-time streaming content co-creation, inline writing copilot execution, and self-healing JSON schema validation.

---

## Technical Stack
* **Framework:** FastAPI 0.136+ (Python 3.14+)
* **LLM Engine:** LangChain 1.2+ (Multi-provider abstraction via `init_chat_model`)
* **Supported LLM Providers:** OpenAI, Anthropic, Google Gemini, Mistral, Nvidia NIM
* **Persistence & ORM:** PostgreSQL 18 (port 5433) + SQLAlchemy 2.0 / Alembic migrations
* **Tracing & Observability:** Langfuse Python SDK (4.6+)
* **Testing:** pytest 8.4+, httpx, asyncio-pytest

---

## Core Features

### 1. Dynamic Langfuse Prompt Catalog
All core system prompts are decoupled from python code and loaded dynamically from the local or cloud Langfuse host. If the Langfuse server is unreachable, the application automatically falls back to static default string templates:
* **`schema-generation-system`:** Multi-turn conversational schema co-creation.
* **`content-drafting-system` / `content-drafting-user`:** Multi-phase creation drafting.
* **`content-refinement-system` / `content-refinement-user`:** User-directed iterative drafting adjustments.
* **`copilot-system`:** Inline editor section writing.
* **`content-healing-system`:** Formatter that corrects unstructured text output into valid JSON.

### 2. Self-Healing Output Parsing
LLM generation is highly non-deterministic. If the primary generation fails to return structured JSON adhering to the target Payload schema, a **Self-Healing Recovery Chain** interceptor catches the formatting or validation error, automatically sends the unstructured draft + schema requirements to a recovery model, heals the JSON output, and returns the successfully structured result.

### 3. Native Agent Tools
* **`schema_resolver`:** A LangChain tool enabling the AI to retrieve actual field schemas from the CMS monolith for dynamic relationship binding.
* **`image_generator`:** Triggers automatic DALL-E image generation for schema upload/media fields.

---

## Local Setup & Development

### 1. Python Environment Setup
Navigate to the microservice directory and build your Python environment:
```bash
cd apps/content-authoring-service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file from the example:
```bash
cp .env.example .env
```
Ensure your configuration values are correctly populated:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/hermes_authoring
LANGCHAIN_MODEL_PROVIDER=nvidia
LANGCHAIN_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
NVIDIA_API_KEY=nvapi-...

# Langfuse Configuration
LANGFUSE_PUBLIC_KEY=pk-lf-9676908d-207e-4ce2-9915-22b593f3ddf7
LANGFUSE_SECRET_KEY=sk-lf-78cc208a-f12f-458e-a937-730fd8f56ad1
LANGFUSE_BASE_URL=http://localhost:3003
```

### 3. Running the Service Locally
Start the hot-reloading development server:
```bash
./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## API Documentation (Endpoints Guide)

### 1. `POST /api/ai/draft` (SSE Stream)
Generates a full content draft from a user prompt, streaming token events in real-time.
* **Security:** Secured via `X-Internal-Secret` header authentication.
* **Request Body:**
  ```json
  {
    "prompt": "Write a guide on sustainable energy",
    "content_type_slug": "guides",
    "content_schema": { "fields": [...] },
    "tenant_id": "tenant-uuid",
    "user_id": "user-uuid",
    "locale": "en",
    "langfuse_trace_id": "optional-parent-trace-uuid"
  }
  ```
* **Event Stream Structure:**
  * `event: TEXT_DELTA` (Raw tokens / explanation of thoughts)
  * `event: FIELD_START` (When the AI begins generating a specific JSON field)
  * `event: FIELD_COMPLETE` (When a JSON field is completed)
  * `event: SCHEMA_UPDATED` (Emitted during the bootstrap flow if a new content type was created)
  * `event: DRAFT_COMPLETE` (Final JSON payload + usage token metrics)

### 2. `POST /api/ai/refine` (SSE Stream)
Iteratively adjusts an existing content draft based on user-directed feedback.
* **Request Body:**
  ```json
  {
    "prompt": "Make the introduction sound much more professional",
    "current_draft_json": { "title": "Sustainable energy", "introduction": "It is cool..." },
    "content_schema": { "fields": [...] },
    "tenant_id": "tenant-uuid",
    "user_id": "user-uuid"
  }
  ```

### 3. `POST /api/ai/generate-schema`
Accepts a natural language prompt (e.g. "Create a product page schema with review fields") and designs a fully compatible Payload CMS collection schema object.
* **Request Body:**
  ```json
  {
    "prompt": "Create a review system",
    "tenant_id": "tenant-uuid",
    "user_id": "user-uuid"
  }
  ```

### 4. `POST /api/ai/copilot/edit`
Applies localized AI suggestions directly to a specific block or section of a rich-text block in the editor.
* **Request Body:**
  ```json
  {
    "content_item_id": "item-id",
    "section_id": "block-id",
    "prompt": "rewrite in passive voice",
    "tenant_id": "tenant-uuid",
    "user_id": "user-uuid"
  }
  ```

### 5. `GET /api/ai/sessions/{session_id}`
Polls the execution state and intermediate message history of an active co-creation session.

### 6. `GET /health`
Liveness monitoring endpoint. Returns `{"status": "ok", "service": "content-authoring-service"}`.

---

## Seeding New Prompts to Langfuse

To populate your local Langfuse server with the necessary dynamic prompt catalog, you can use the `langfuse-cli` or execute a quick seeding python script using the Langfuse client:

```python
from langfuse import Langfuse
lf = Langfuse()

lf.create_prompt(
    name="copilot-system",
    type="text",
    prompt="Your copilot instructions here...",
    labels=["production"]
)
```

---

## Running Unit and Integration Tests

Our test suite is written using `pytest` and implements complete mocks for LLM runnables, API response generators, and Langfuse connection fallbacks:
```bash
# Run the complete test suite
./venv/bin/pytest
```
Currently, **61 unit and integration tests** validate the schema matching, self-healing intercepters, tone modifications, database session repositories, and offline prompt safety.
