# Module Group 200

> 12 nodes · cohesion 0.24

## Key Concepts

- **DraftingState** (8 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **call_drafting_llm()** (7 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **execute_drafting_tools()** (6 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **drafting_graph.py** (5 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **Any** (4 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **RunnableConfig** (4 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **should_continue_drafting()** (3 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **StateGraph for AI Content Drafting workflow using LangGraph.** (1 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **Custom executor node to securely run tools and catch execution errors.** (1 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **Conditional routing edge checking for pending tool calls.** (1 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **State tracking across the structured drafting graph.** (1 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`
- **Invokes the LLM bound with DALL-E and Schema resolver tools.** (1 connections) — `apps/content-authoring-service/src/application/graphs/drafting_graph.py`

## Relationships

- [[AI Self-Correction Loop]] (3 shared connections)
- [[Module Group 143]] (3 shared connections)
- [[Module Group 71]] (2 shared connections)
- [[Module Group 251]] (1 shared connections)
- [[Module Group 48]] (1 shared connections)

## Source Files

- `apps/content-authoring-service/src/application/graphs/drafting_graph.py`

## Audit Trail

- EXTRACTED: 33 (79%)
- INFERRED: 9 (21%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*