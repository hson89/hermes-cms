"""
AI Agent application service.

Orchestrates LangChain to generate content schemas from natural language
prompts.  Persists session state using the in-memory session repository
(swapped for DB-backed repository in production).

T016 - Implement AI Agent service with LangChain 1.2+ for schema/content generation
"""

from __future__ import annotations

import json
import re
from typing import AsyncGenerator
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from src.domain.ai_agent_session.models import AIAgentSession, SessionStatus
from src.domain.schema_validator import validate_content_schema, InvalidSchemaError
from src.infrastructure.config import settings

# In-memory session store (replaced by a proper repository in Phase 2 / DB task)
_sessions: dict[str, AIAgentSession] = {}

# ── Prompts ───────────────────────────────────────────────────────────────────

_SCHEMA_GENERATION_SYSTEM_PROMPT = """\
You are an expert content modeler and Hermes AI assistant.
Your job is to help the user co-create or modify content type schemas.

You MUST return a JSON object with two keys:
1. "explanation": A friendly, developer-oriented description of the changes you made, or any warnings/recommendations.
2. "schema": The complete content type schema conforming strictly to the structure:
   {
     "name": "<name>",
     "fields": [
       {
         "name": "<field name>",
         "type": "<text|number|boolean|date|richText|json|relationship|select|upload|array|blocks>",
         "required": true|false,
         "label": "<UI label>",
         "description": "<optional description>",
         "localized": true|false,
         "unique": true|false,
         "fields": [...] (only if type is array),
         "blocks": [...] (only if type is blocks)
       }
     ]
   }

Return ONLY this single JSON object. Do not include markdown code fencing or other prose outside the JSON.
"""


def _extract_partial_explanation(text: str) -> str:
    """Helper to extract the partial explanation string from a streaming JSON block."""
    # 1. Look for fully closed explanation
    match = re.search(r'"explanation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
    if match:
        return match.group(1).replace('\\"', '"').replace('\\n', '\n')
    # 2. Look for open/streaming explanation
    match_partial = re.search(r'"explanation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)$', text)
    if match_partial:
        return match_partial.group(1).replace('\\"', '"').replace('\\n', '\n')
    return ""


# ── Service ───────────────────────────────────────────────────────────────────


class AIService:
    """
    Application-layer service for AI-powered content operations.

    Responsibilities:
       - Create and manage AIAgentSession aggregates.
       - Invoke the LLM via LangChain to generate content schemas.
       - Return structured results back to the CMS endpoint layer.
    """

    def __init__(self) -> None:
        # Client is lazy-initialised on first use so that tests can mock
        # this class without needing real API credentials.
        self.__llm = None  # lazy

    @property
    def _llm(self):
        """Return (or create) the LangChain chat model instance."""
        if self.__llm is None:
            self.__llm = self.get_model()
        return self.__llm

    def get_model(self, model_override: str | None = None):
        """Return a configured LangChain chat model, optionally overriding the default."""
        provider = settings.LANGCHAIN_MODEL_PROVIDER
        model_name = settings.LANGCHAIN_MODEL

        if model_override:
            if "/" in model_override:
                provider, model_name = model_override.split("/", 1)
            else:
                model_name = model_override

        if provider == "nvidia":
            from langchain_nvidia_ai_endpoints import ChatNVIDIA
            kwargs = {
                "model": model_name,
                "api_key": settings.NVIDIA_API_KEY,
                "temperature": settings.NVIDIA_TEMPERATURE,
                "top_p": settings.NVIDIA_TOP_P,
                "max_tokens": settings.NVIDIA_MAX_TOKENS,
                "model_kwargs": {
                    "reasoning_budget": settings.NVIDIA_REASONING_BUDGET,
                    "chat_template_kwargs": {"enable_thinking": settings.NVIDIA_ENABLE_THINKING},
                },
            }
            if settings.LANGCHAIN_ENDPOINT_URL and "11434" not in settings.LANGCHAIN_ENDPOINT_URL:
                kwargs["base_url"] = settings.LANGCHAIN_ENDPOINT_URL
            return ChatNVIDIA(**kwargs)
        else:
            kwargs = {}
            if settings.LANGCHAIN_ENDPOINT_URL:
                kwargs["base_url"] = settings.LANGCHAIN_ENDPOINT_URL

            return init_chat_model(
                model=model_name,
                model_provider=provider,
                **kwargs,
            )

    # ── Schema Generation ──────────────────────────────────────────────────
 
    async def generate_schema(
        self,
        *,
        prompt: str,
        tenant_id: str,
        user_id: str,
        current_schema: dict | None = None,
        db: AsyncSession | None = None,
    ) -> dict:
        """
        Creates a new AIAgentSession, invokes the LLM to generate a JSON schema,
        and returns the session metadata together with the generated schema.

        Args:
            prompt:          Natural-language description of the desired content type.
            tenant_id:       The ID of the tenant that owns the session.
            user_id:         The ID of the user initiating the request.
            current_schema:  Optional existing content schema to ground the model.
            db:              Optional async SQLAlchemy database session.

        Returns:
            dict with keys: sessionId, schema (dict), status, message (str)
        """
        session = AIAgentSession(user_id=user_id, tenant_id=tenant_id)
        
        async def save_session():
            if db is not None:
                from src.infrastructure.repositories.session_repository import SQLSessionRepository
                await SQLSessionRepository(db).save(session)
            else:
                _sessions[str(session.id)] = session

        await save_session()

        # Build initial messages context
        session.add_message("system", _SCHEMA_GENERATION_SYSTEM_PROMPT)
        session.add_message("user", prompt)
        await save_session()

        grounding_content = ""
        if current_schema:
            grounding_content += f"[Current Schema State]\n{json.dumps(current_schema, indent=2)}\n\n"
        grounding_content += f"[User Request]\n{prompt}"

        messages = [
            SystemMessage(content=_SCHEMA_GENERATION_SYSTEM_PROMPT),
            HumanMessage(content=grounding_content),
        ]

        max_retries = 3
        retry_count = 0
        last_error_message = ""

        while retry_count <= max_retries:
            try:
                response = await self._llm.ainvoke(messages)
                raw_content = (
                    response.content
                    if isinstance(response.content, str)
                    else str(response.content)
                )

                # Append assistant's raw attempt to aggregate session
                session.add_message("assistant", raw_content)
                await save_session()

                # Clean prompt formatting details from markdown blocks if present
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_content, re.DOTALL)
                clean_content = match.group(1).strip() if match else raw_content.strip()

                parsed = json.loads(clean_content)
                
                # Robust double-format parsing (backwards compatibility wrapper)
                if "schema" in parsed and "fields" in parsed["schema"]:
                    schema = parsed["schema"]
                    explanation = parsed.get("explanation", "")
                elif "fields" in parsed:
                    schema = parsed
                    explanation = ""
                else:
                    raise ValueError("Invalid schema JSON structure (missing fields or nested schema)")

                validate_content_schema(schema)

                # If successful parsing and validation, mark completed and return
                session.complete()
                await save_session()
                return {
                    "sessionId": str(session.id),
                    "schema": schema,
                    "status": SessionStatus.COMPLETED,
                    "message": explanation,
                }
            except (json.JSONDecodeError, InvalidSchemaError, ValueError) as exc:
                last_error_message = str(exc)
                retry_count += 1

                if retry_count > max_retries:
                    break

                feedback_message = (
                    f"The schema you generated is invalid. Please correct the following errors and "
                    f"return the complete, corrected JSON schema as valid JSON conforming strictly to the original schema structure:\n\n"
                    f"{exc}\n\n"
                    f"Do NOT include any markdown code fencing or conversational prose in your response. Raw JSON only."
                )

                session.add_message("user", feedback_message)
                await save_session()

                # Append standard conversation turn history to the LangChain prompt thread
                messages.append(AIMessage(content=raw_content))
                messages.append(HumanMessage(content=feedback_message))

            except Exception as exc:
                session.fail()
                await save_session()
                raise RuntimeError(
                    f"Schema generation failed due to unexpected error: {exc}"
                ) from exc

        # If loop exhausts all retries without a valid schema
        session.fail()
        await save_session()
        raise ValueError(
            f"Failed to generate a valid schema after {max_retries} retries. Last error: {last_error_message}"
        )

    # ── Streaming Co-creation ─────────────────────────────────────────────

    async def continue_generation_session_stream(
        self,
        *,
        session_id: str,
        prompt: str,
        current_schema: dict | None = None,
        db: AsyncSession | None = None,
    ) -> AsyncGenerator[dict, None]:
        """
        Continues an existing schema co-creation session, returning a real-time SSE event stream
        of explanation tokens and final schema state changes.

        Yields:
            Dict containing: 'event' (TEXT_DELTA | STATE_DELTA | STATUS_UPDATE) and 'data' (any)
        """
        session = await self.get_session(session_id, db)
        if not session:
            raise ValueError(f"Session with ID {session_id} not found.")

        # Activate session
        session.status = SessionStatus.ACTIVE
        
        async def save_session():
            if db is not None:
                from src.infrastructure.repositories.session_repository import SQLSessionRepository
                await SQLSessionRepository(db).save(session)
            else:
                _sessions[str(session.id)] = session

        await save_session()

        # Build message history for LangChain
        langchain_messages = []
        for msg in session.context:
            if msg.role == "system":
                langchain_messages.append(SystemMessage(content=msg.content))
            elif msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                langchain_messages.append(AIMessage(content=msg.content))

        # Append new user turn with optional layout grounding context
        grounding_content = ""
        if current_schema:
            grounding_content += f"[Current Schema State]\n{json.dumps(current_schema, indent=2)}\n\n"
        grounding_content += f"[User Request]\n{prompt}"
        
        langchain_messages.append(HumanMessage(content=grounding_content))

        # Save clean user prompt in database conversation context
        session.add_message("user", prompt)
        await save_session()

        yield {"event": "STATUS_UPDATE", "data": "generating"}

        max_retries = 3
        retry_count = 0
        last_error_message = ""
        raw_content = ""
        schema = None
        explanation = ""

        while retry_count <= max_retries:
            try:
                raw_content = ""
                last_emitted_len = 0
                
                # Stream directly from LLM
                async for chunk in self._llm.astream(langchain_messages):
                    chunk_text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
                    raw_content += chunk_text
                    
                    # Live extract partial explanation delta
                    curr_explanation = _extract_partial_explanation(raw_content)
                    if len(curr_explanation) > last_emitted_len:
                        delta = curr_explanation[last_emitted_len:]
                        yield {"event": "TEXT_DELTA", "data": delta}
                        last_emitted_len = len(curr_explanation)

                # Clean prompt formatting details from markdown blocks if present
                match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw_content, re.DOTALL)
                clean_content = match.group(1).strip() if match else raw_content.strip()

                parsed = json.loads(clean_content)

                # Parse layout double-format
                if "schema" in parsed and "fields" in parsed["schema"]:
                    schema = parsed["schema"]
                    explanation = parsed.get("explanation", "")
                elif "fields" in parsed:
                    schema = parsed
                    explanation = ""
                else:
                    raise ValueError("Invalid schema JSON structure (missing fields or nested schema)")

                # Perform standard CMS domain constraints validation
                yield {"event": "STATUS_UPDATE", "data": "validating"}
                validate_content_schema(schema)

                # Complete and persist the session
                session.add_message("assistant", raw_content)
                session.complete()
                await save_session()

                # Dispatch final STATE_DELTA containing the verified schema structure
                yield {"event": "STATE_DELTA", "data": schema}
                yield {"event": "STATUS_UPDATE", "data": "completed"}
                return

            except (json.JSONDecodeError, InvalidSchemaError, ValueError) as exc:
                last_error_message = str(exc)
                retry_count += 1
                
                if retry_count > max_retries:
                    break

                yield {"event": "STATUS_UPDATE", "data": "self-correcting"}

                feedback_message = (
                    f"The schema you generated is invalid. Please correct the following errors and "
                    f"return the complete, corrected JSON schema as valid JSON conforming strictly to the original schema structure:\n\n"
                    f"{exc}\n\n"
                    f"Do NOT include any markdown code fencing or conversational prose in your response. Raw JSON only."
                )

                # Record correction prompt inside session
                session.add_message("assistant", raw_content)
                session.add_message("user", feedback_message)
                await save_session()

                # Append retry logs to LLM messages
                langchain_messages.append(AIMessage(content=raw_content))
                langchain_messages.append(HumanMessage(content=feedback_message))

            except Exception as exc:
                session.fail()
                await save_session()
                yield {"event": "STATUS_UPDATE", "data": "failed"}
                raise RuntimeError(
                    f"Streaming schema generation failed: {exc}"
                ) from exc

        # If exhausted all correction cycles without success
        session.fail()
        await save_session()
        yield {"event": "STATUS_UPDATE", "data": "failed"}
        raise ValueError(
            f"Failed to generate a valid schema after {max_retries} stream retries. Last error: {last_error_message}"
        )

    # ── Session Retrieval ──────────────────────────────────────────────────

    async def get_session(self, session_id: str, db: AsyncSession | None = None) -> AIAgentSession | None:
        """Retrieve an existing session by its ID."""
        if db is not None:
            from src.infrastructure.repositories.session_repository import SQLSessionRepository
            try:
                return await SQLSessionRepository(db).get_by_id(UUID(session_id))
            except ValueError:
                return None
        return _sessions.get(session_id)
