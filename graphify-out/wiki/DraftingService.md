# DraftingService

> God node · 28 connections · `apps/content-authoring-service/src/application/drafting_service.py`

**Community:** [[AI Copilot Drafting Service]]

## Connections by Relation

### calls
- [[draft_content()]] `INFERRED`
- [[generate_draft()]] `INFERRED`
- [[drafting_service()]] `INFERRED`
- [[test_drafting_service_appends_style_modifier()]] `INFERRED`

### contains
- [[drafting_service.py]] `EXTRACTED`

### method
- [[.generate_draft_stream()]] `EXTRACTED`
- [[.refine_draft_stream()]] `EXTRACTED`
- [[.__init__()]] `EXTRACTED`

### rationale_for
- [[Orchestrates the AI drafting workflow, including streaming and tool calling.]] `EXTRACTED`

### uses
- [[AIService]] `INFERRED`
- [[AIAgentSession]] `INFERRED`
- [[RefineService]] `INFERRED`
- [[AIBaseRequest]] `INFERRED`
- [[Any]] `INFERRED`
- [[Request]] `INFERRED`
- [[GenerateSchemaRequest]] `INFERRED`
- [[SessionMessageRequest]] `INFERRED`
- [[MockDraftingGraph]] `INFERRED`
- [[AsyncSession]] `INFERRED`
- [[FastAPI]] `INFERRED`
- [[CopilotEditRequest]] `INFERRED`
- [[DraftRequest]] `INFERRED`
- [[RefineRequest]] `INFERRED`
- [[GenerateSchemaResponse]] `INFERRED`
- [[Any]] `INFERRED`
- [[StreamingResponse]] `INFERRED`
- [[Any]] `INFERRED`
- [[AsyncClient]] `INFERRED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*