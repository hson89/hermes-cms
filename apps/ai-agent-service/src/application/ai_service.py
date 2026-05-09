"""
AI Agent application service.

Orchestrates LangChain to generate content schemas from natural language
prompts.  Persists session state using the in-memory session repository
(swapped for DB-backed repository in production).

T016 - Implement AI Agent service with LangChain 1.2+ for schema/content generation
"""

from __future__ import annotations

import json
import os
from uuid import UUID

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

from src.domain.ai_agent_session.models import AIAgentSession, SessionStatus

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
      "type": "<text|number|boolean|date|richText|json|relationship>",
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
        # Store model ID; the actual LLM client is lazy-initialised on first use
        # so that tests can mock this class without needing real API credentials.
        self._model_id = os.environ.get("LANGCHAIN_MODEL", "gpt-4o-mini")
        self.__llm = None  # lazy

    @property
    def _llm(self):
        """Return (or create) the LangChain chat model instance."""
        if self.__llm is None:
            self.__llm = init_chat_model(self._model_id)
        return self.__llm

    # ── Schema Generation ──────────────────────────────────────────────────

    async def generate_schema(
        self,
        *,
        prompt: str,
        tenant_id: UUID,
        user_id: UUID,
    ) -> dict:
        """
        Creates a new AIAgentSession, invokes the LLM to generate a JSON schema,
        and returns the session metadata together with the generated schema.

        Args:
            prompt:    Natural-language description of the desired content type.
            tenant_id: UUID of the tenant that owns the session.
            user_id:   UUID of the user initiating the request.

        Returns:
            dict with keys: sessionId, schema (dict), status
        """
        session = AIAgentSession(user_id=user_id, tenant_id=tenant_id)
        _sessions[str(session.id)] = session

        # Build messages
        session.add_message("system", _SCHEMA_GENERATION_SYSTEM_PROMPT)
        session.add_message("user", prompt)

        messages = [
            SystemMessage(content=_SCHEMA_GENERATION_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]

        try:
            response = await self._llm.ainvoke(messages)
            raw_content = (
                response.content
                if isinstance(response.content, str)
                else str(response.content)
            )
            schema = json.loads(raw_content)
            session.add_message("assistant", raw_content)
            session.complete()

            return {
                "sessionId": str(session.id),
                "schema": schema,
                "status": SessionStatus.COMPLETED,
            }
        except json.JSONDecodeError as exc:
            session.fail()
            raise ValueError(
                f"LLM returned non-JSON output: {exc}"
            ) from exc
        except Exception as exc:
            session.fail()
            raise RuntimeError(
                f"Schema generation failed: {exc}"
            ) from exc

    # ── Session Retrieval ──────────────────────────────────────────────────

    def get_session(self, session_id: str) -> AIAgentSession | None:
        """Retrieve an existing session by its ID."""
        return _sessions.get(session_id)
