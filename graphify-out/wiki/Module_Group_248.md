# Module Group 248

> 11 nodes · cohesion 0.20

## Key Concepts

- **handle_graph_stream()** (8 connections) — `apps/content-authoring-service/src/application/stream_utils.py`
- **extract_json_from_text()** (3 connections) — `apps/content-authoring-service/src/application/stream_utils.py`
- **calculate_cost()** (3 connections) — `apps/content-authoring-service/src/domain/content_drafting/cost_calculator.py`
- **stream_utils.py** (2 connections) — `apps/content-authoring-service/src/application/stream_utils.py`
- **cost_calculator.py** (2 connections) — `apps/content-authoring-service/src/domain/content_drafting/cost_calculator.py`
- **get_model_metadata()** (2 connections) — `apps/content-authoring-service/src/domain/content_drafting/cost_calculator.py`
- **Unified handler for LangGraph astream_events, processing chunks, field detection** (1 connections) — `apps/content-authoring-service/src/application/stream_utils.py`
- **Extracts and parses JSON from a text block, handling markdown blocks and raw str** (1 connections) — `apps/content-authoring-service/src/application/stream_utils.py`
- **Any** (1 connections) — `apps/content-authoring-service/src/application/stream_utils.py`
- **Calculates the cost of an AI operation in USD microdollars.     $1.00 = 1,000,00** (1 connections) — `apps/content-authoring-service/src/domain/content_drafting/cost_calculator.py`
- **Returns provider and model name from a model identifier.     Example: 'openai/gp** (1 connections) — `apps/content-authoring-service/src/domain/content_drafting/cost_calculator.py`

## Relationships

- [[AI Self-Correction Loop]] (2 shared connections)
- [[Module Group 71]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/application/stream_utils.py`
- `apps/content-authoring-service/src/domain/content_drafting/cost_calculator.py`

## Audit Trail

- EXTRACTED: 20 (80%)
- INFERRED: 5 (20%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*