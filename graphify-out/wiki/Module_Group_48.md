# Module Group 48

> 26 nodes · cohesion 0.13

## Key Concepts

- **ConversationMessage** (16 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **SessionStatus** (14 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **InvalidSchemaError** (12 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- **ValueError** (11 connections)
- **.generate_schema()** (8 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **.continue_generation_session_stream()** (7 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **.get_session()** (7 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **Any** (7 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **AsyncSession** (7 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **models.py** (5 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **._get_langfuse_handler()** (5 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **CallbackHandler** (5 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **.add_message()** (3 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **Enum** (2 connections)
- **.prompt_must_not_be_empty()** (2 connections) — `apps/content-authoring-service/src/main.py`
- **.prompt_must_not_be_empty()** (2 connections) — `apps/content-authoring-service/src/main.py`
- **AIAgentSession domain model and aggregate root.  T014 - Create AIAgentSession mo** (1 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **Lifecycle states for an AI Agent conversation session.** (1 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **A single message in the conversation history.** (1 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **Append a message to the conversation history and touch updated_at.** (1 connections) — `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- **Creates a new schema generation session, invokes the LangGraph schema_graph,** (1 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **Continues an existing schema co-creation session, returning a real-time SSE even** (1 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **Retrieve an existing session's LangGraph state and format it as AIAgentSession c** (1 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **Initialize Langfuse callback handler if configured.** (1 connections) — `apps/content-authoring-service/src/application/ai_service.py`
- **Raised when a generated schema violates Hermes content-modeling constraints.** (1 connections) — `apps/content-authoring-service/src/domain/schema_validator.py`
- *... and 1 more nodes in this community*

## Relationships

- [[AI Self-Correction Loop]] (14 shared connections)
- [[AI Agent Session Management]] (7 shared connections)
- [[Schema Validator Domain Tests]] (6 shared connections)
- [[AI Authoring Service Core]] (3 shared connections)
- [[MCP Tool Adapters (Python)]] (2 shared connections)
- [[Module Group 304]] (2 shared connections)
- [[AI Copilot Drafting Service]] (2 shared connections)
- [[Module Group 429]] (1 shared connections)
- [[Module Group 200]] (1 shared connections)
- [[AI Content Creation Tests]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/application/ai_service.py`
- `apps/content-authoring-service/src/domain/ai_agent_session/models.py`
- `apps/content-authoring-service/src/domain/schema_validator.py`
- `apps/content-authoring-service/src/main.py`

## Audit Trail

- EXTRACTED: 66 (54%)
- INFERRED: 57 (46%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*