"""
FastAPI AI Microservice entry point.

Exposes:
  - POST /api/ai/generate-schema   – AI schema generation (T017 integration)
  - GET  /api/ai/sessions/{id}     – Session status polling
  - POST /api/ai/copilot/edit      – AI copilot section edit (T023)
  - GET  /health                   – Health check

T003 - Initialize FastAPI Microservice project
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from typing import Any
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Request, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ai_service import AIService
from src.infrastructure.config import settings
from src.infrastructure.database import get_db

# ── Security ──────────────────────────────────────────────────────────────────

from src.infrastructure.auth import require_internal_secret as _require_internal_secret



# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN001
    """Application lifespan – initialise / teardown shared resources."""
    app.state.ai_service = AIService()
    
    # Decoupled setup: Execute checkpointer setup exactly once on startup
    from src.infrastructure.database import get_db_checkpointer
    async with get_db_checkpointer() as saver:
        await saver.setup()
        app.state.checkpointer = saver
        
        # Compile graphs with checkpointer exactly once to prevent rebuild overhead
        from src.application.graphs.schema_graph import builder as schema_builder
        from src.application.graphs.drafting_graph import builder as drafting_builder
        
        app.state.schema_graph = schema_builder.compile(checkpointer=saver)
        app.state.drafting_graph = drafting_builder.compile(checkpointer=saver)
        
        yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Hermes Content Authoring Service",
    description=(
        "FastAPI Content Authoring microservice for schema generation and content copilot. "
        "Part of the Hermes AI platform."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────


class GenerateSchemaRequest(BaseModel):
    """Payload for POST /api/ai/generate-schema."""

    prompt: str
    tenant_id: str
    user_id: str
    current_schema: dict | None = None
    langfuse_trace_id: str | None = None

    @field_validator("tenant_id", "user_id", mode="before")
    @classmethod
    def coerce_id_to_str(cls, v: Any) -> str:
        if v is None:
            return v
        return str(v)

    @field_validator("prompt")
    @classmethod
    def prompt_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("prompt must not be empty.")
        return v.strip()


class GenerateSchemaResponse(BaseModel):
    """Response for POST /api/ai/generate-schema."""

    session_id: str
    content_schema: dict  # renamed from 'schema' to avoid BaseModel shadow
    status: str


class CopilotEditRequest(BaseModel):
    """Payload for POST /api/ai/copilot/edit."""

    content_item_id: str
    section_id: str
    prompt: str
    tenant_id: str
    user_id: str
    langfuse_trace_id: str | None = None

    @field_validator("content_item_id", "section_id", "tenant_id", "user_id", mode="before")
    @classmethod
    def coerce_id_to_str(cls, v: Any) -> str:
        if v is None:
            return v
        return str(v)


class SessionMessageRequest(BaseModel):
    """Payload for POST /api/ai/sessions/{session_id}/message."""

    prompt: str
    current_schema: dict | None = None
    langfuse_trace_id: str | None = None

    @field_validator("prompt")
    @classmethod
    def prompt_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("prompt must not be empty.")
        return v.strip()


class DraftRequest(BaseModel):
    """Payload for POST /api/ai/draft."""

    prompt: str
    content_type_slug: str | None = None
    content_schema: dict | None = None
    tenant_id: str
    user_id: str
    locale: str = "en"
    style_modifier_id: str | None = None
    style_modifier_prompt: str | None = None
    model_override: str | None = None
    # Accept both camelCase (from CMS proxy) and snake_case variants
    modelOverride: str | None = None
    session_id: str | None = None
    langfuse_trace_id: str | None = None

    @field_validator("tenant_id", "user_id", "session_id", "content_type_slug", mode="before")
    @classmethod
    def coerce_id_to_str(cls, v: Any) -> str:
        if v is None:
            return v
        return str(v)


    def resolved_model_override(self) -> str | None:
        """
        Return the model override only when the requested provider has credentials
        configured in the environment.  Prevents a tenant-configured openai model
        from overriding the service's own provider settings (e.g. nvidia) when the
        OpenAI key is not available.
        """
        import os
        raw = self.model_override or self.modelOverride
        if not raw:
            return None

        provider = raw.split("/")[0].lower() if "/" in raw else ""
        key_map = {
            "openai":    os.environ.get("OPENAI_API_KEY", ""),
            "anthropic": os.environ.get("ANTHROPIC_API_KEY", ""),
            "google":    os.environ.get("GOOGLE_API_KEY", ""),
            "mistral":   os.environ.get("MISTRAL_API_KEY", ""),
            "nvidia":    os.environ.get("NVIDIA_API_KEY", ""),
        }
        # Placeholder / missing keys start with "your-" or are empty
        api_key = key_map.get(provider, "")
        if not api_key or api_key.startswith("your-"):
            return None
        return raw


class RefineRequest(BaseModel):
    """Payload for POST /api/ai/refine."""

    prompt: str
    current_draft_json: dict
    content_schema: dict
    tenant_id: str
    user_id: str
    locale: str = "en"
    langfuse_trace_id: str | None = None

    @field_validator("tenant_id", "user_id", mode="before")
    @classmethod
    def coerce_id_to_str(cls, v: Any) -> str:
        if v is None:
            return v
        return str(v)


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health", tags=["Meta"])
async def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "content-authoring-service"}


@app.post(
    "/api/ai/draft",
    tags=["AI Drafting"],
    summary="Generate a full content draft",
    dependencies=[Security(_require_internal_secret)],
)
async def generate_draft(
    body: DraftRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Generate a full content draft from a natural language prompt.
    Returns a stream of tokens for the explanation/thought process,
    followed by the final JSON draft.
    """
    from src.application.drafting_service import DraftingService  # noqa: PLC0415

    drafting_service = DraftingService(request.app.state.ai_service)

    async def event_generator():
        try:
            async for event in drafting_service.generate_draft_stream(
                prompt=body.prompt,
                content_type_slug=body.content_type_slug,
                schema_json=body.content_schema,
                tenant_id=body.tenant_id,
                user_id=body.user_id,
                db=db,
                locale=body.locale,
                style_modifier_id=body.style_modifier_id,
                style_modifier_prompt=body.style_modifier_prompt,
                model_override=body.resolved_model_override(),
                session_id=body.session_id,
                langfuse_trace_id=body.langfuse_trace_id,
                drafting_graph=request.app.state.drafting_graph,
            ):
                if await request.is_disconnected():
                    break
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
        except Exception as exc:
            import traceback
            traceback.print_exc()
            yield f"event: ERROR\ndata: {json.dumps({'detail': f'Internal server error during draft: {exc}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post(
    "/api/ai/refine",
    tags=["AI Drafting"],
    summary="Refine an existing content draft",
    dependencies=[Security(_require_internal_secret)],
)
async def refine_draft(
    body: RefineRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Refine an existing content draft based on user feedback.
    Returns a stream of tokens for the explanation, followed by updated JSON.
    """
    from src.application.refine_service import RefineService  # noqa: PLC0415

    refine_service = RefineService(request.app.state.ai_service)

    async def event_generator():
        try:
            async for event in refine_service.refine_draft_stream(
                prompt=body.prompt,
                current_draft_json=body.current_draft_json,
                schema_json=body.content_schema,
                tenant_id=body.tenant_id,
                user_id=body.user_id,
                db=db,
                locale=body.locale,
                langfuse_trace_id=body.langfuse_trace_id,
                drafting_graph=request.app.state.drafting_graph,
            ):
                if await request.is_disconnected():
                    break
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
        except Exception as exc:
            import traceback
            traceback.print_exc()
            yield f"event: ERROR\ndata: {json.dumps({'detail': f'Internal server error during refinement: {exc}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post(
    "/api/ai/generate-schema",
    response_model=GenerateSchemaResponse,
    status_code=status.HTTP_200_OK,
    tags=["AI"],
    summary="Generate a content schema from natural language",
    dependencies=[Security(_require_internal_secret)],
)
async def generate_schema(
    body: GenerateSchemaRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> GenerateSchemaResponse:
    """
    Accepts a natural-language prompt and returns a structured content schema
    generated by the LLM.  Creates an AIAgentSession to track the conversation.

    T016 - Invokes AIService.generate_schema
    T018 - Called by the CMS generate-schema endpoint
    """
    ai_service: AIService = request.app.state.ai_service
    try:
        result = await ai_service.generate_schema(
            prompt=body.prompt,
            tenant_id=body.tenant_id,
            user_id=body.user_id,
            current_schema=body.current_schema,
            db=db,
            langfuse_trace_id=body.langfuse_trace_id,
            schema_graph=request.app.state.schema_graph,
        )
        return GenerateSchemaResponse(
            session_id=result["sessionId"],
            content_schema=result["schema"],
            status=result["status"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@app.get(
    "/api/ai/sessions/{session_id}",
    tags=["AI"],
    summary="Get AI session status",
    dependencies=[Security(_require_internal_secret)],
)
async def get_session(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the current status and context of an AIAgentSession."""
    ai_service: AIService = request.app.state.ai_service
    session = await ai_service.get_session(session_id, db=db, schema_graph=request.app.state.schema_graph)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    
    schema_data = None
    if session.status == "completed":
        import json
        import re
        for msg in reversed(session.context):
            if msg.role == "assistant":
                try:
                    raw_content = msg.content.strip()
                    # Clean prompt formatting details from markdown blocks if present
                    match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_content, re.DOTALL)
                    clean_content = match.group(1).strip() if match else raw_content
                    schema_data = json.loads(clean_content)
                    break
                except Exception as e:
                    print(f"Error parsing schema from context: {e}")
                    pass

    return {
        "id": str(session.id),
        "status": session.status,
        "tenant_id": str(session.tenant_id),
        "user_id": str(session.user_id),
        "message_count": len(session.context),
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "schema": schema_data,
        "context": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
            }
            for msg in session.context
        ],
    }


@app.post(
    "/api/ai/copilot/edit",
    tags=["AI"],
    summary="Apply an AI edit to a specific content section",
    dependencies=[Security(_require_internal_secret)],
)
async def copilot_edit(body: CopilotEditRequest, request: Request) -> dict:
    """
    Applies the AI copilot's suggestion to a specific section of content.
    Returns the edited content section text.

    T023 - Implement AI service logic for localized section editing
    """
    from src.application.copilot_service import CopilotService  # noqa: PLC0415

    copilot_service = CopilotService(request.app.state.ai_service)
    try:
        edited_content = await copilot_service.edit_section(
            content_item_id=body.content_item_id,
            section_id=body.section_id,
            prompt=body.prompt,
            tenant_id=body.tenant_id,
            user_id=body.user_id,
            langfuse_trace_id=body.langfuse_trace_id,
        )
        return {"section_id": body.section_id, "content": edited_content}
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@app.post(
    "/api/ai/sessions/{session_id}/message",
    tags=["AI"],
    summary="Continue a schema co-creation session using Server-Sent Events (SSE)",
    dependencies=[Security(_require_internal_secret)],
)
async def post_session_message(
    session_id: str,
    body: SessionMessageRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Continues a schema co-creation session, returning a real-time SSE stream
    of explanation tokens and final schema updates.
    """
    ai_service: AIService = request.app.state.ai_service

    async def event_generator():
        try:
            async for event in ai_service.continue_generation_session_stream(
                session_id=session_id,
                prompt=body.prompt,
                current_schema=body.current_schema,
                db=db,
                langfuse_trace_id=body.langfuse_trace_id,
                schema_graph=request.app.state.schema_graph,
            ):
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'])}\n\n"
        except ValueError as exc:
            yield f"event: STATUS_UPDATE\ndata: \"failed\"\n\n"
            yield f"event: ERROR\ndata: {json.dumps({'detail': str(exc)})}\n\n"
        except Exception as exc:
            yield f"event: STATUS_UPDATE\ndata: \"failed\"\n\n"
            yield f"event: ERROR\ndata: {json.dumps({'detail': f'Internal server error: {exc}'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
