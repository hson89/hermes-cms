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
You are a content modelling expert. Given a natural-language description of a
content type, you MUST return ONLY a valid JSON object that conforms to the
following structure:

{
  "name": "<human-readable name>",
  "fields": [
    {
      "name": "<field name>",
      "type": "<text|number|boolean|date|richText|json|relationship|select|upload>",
      "required": true|false,
      "label": "<UI label>",
      "description": "<optional description>"
    }
  ]
}

Do NOT include any prose or markdown fencing. Return raw JSON only.
"""


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
            kwargs = {}
            if settings.LANGCHAIN_ENDPOINT_URL:
                kwargs["base_url"] = settings.LANGCHAIN_ENDPOINT_URL

            self.__llm = init_chat_model(
                model=settings.LANGCHAIN_MODEL,
                model_provider=settings.LANGCHAIN_MODEL_PROVIDER,
                **kwargs,
            )
        return self.__llm

    # ── Schema Generation ──────────────────────────────────────────────────
 
    async def generate_schema(
        self,
        *,
        prompt: str,
        tenant_id: UUID,
        user_id: UUID,
        db: AsyncSession | None = None,
    ) -> dict:
        """
        Creates a new AIAgentSession, invokes the LLM to generate a JSON schema,
        and returns the session metadata together with the generated schema.

        Args:
            prompt:    Natural-language description of the desired content type.
            tenant_id: UUID of the tenant that owns the session.
            user_id:   UUID of the user initiating the request.
            db:        Optional async SQLAlchemy database session.

        Returns:
            dict with keys: sessionId, schema (dict), status
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

        messages = [
            SystemMessage(content=_SCHEMA_GENERATION_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
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

                schema = json.loads(clean_content)
                validate_content_schema(schema)

                # If successful parsing and validation, mark completed and return
                session.complete()
                await save_session()
                return {
                    "sessionId": str(session.id),
                    "schema": schema,
                    "status": SessionStatus.COMPLETED,
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
