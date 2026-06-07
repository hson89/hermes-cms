# Module Group 304

> 10 nodes · cohesion 0.27

## Key Concepts

- **Any** (6 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **call_schema_llm()** (6 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **RunnableConfig** (4 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **schema_nodes.py** (4 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **_serialize_field()** (4 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **validate_schema_node()** (4 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **LangGraph nodes for the Schema Generation state machine.** (1 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **Validates the generated schema and captures validation errors for self-correctio** (1 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **Helper to convert Pydantic FieldDefinition objects back to standard dicts.** (1 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`
- **Invokes the LLM configured for structured schema output.** (1 connections) — `apps/content-authoring-service/src/application/nodes/schema_nodes.py`

## Relationships

- [[AI Self-Correction Loop]] (2 shared connections)
- [[AI Authoring Service Core]] (2 shared connections)
- [[Module Group 48]] (2 shared connections)
- [[Module Group 71]] (1 shared connections)
- [[Schema Validator Domain Tests]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/application/nodes/schema_nodes.py`

## Audit Trail

- EXTRACTED: 24 (75%)
- INFERRED: 8 (25%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*