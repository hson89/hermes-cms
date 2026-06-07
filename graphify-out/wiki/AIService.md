# AIService

> God node · 52 connections · `apps/content-authoring-service/src/application/ai_service.py`

**Community:** [[AI Self-Correction Loop]]

## Connections by Relation

### calls
- [[SchemaValidator]] `INFERRED`

### contains
- [[ai_service.py]] `EXTRACTED`

### method
- [[.generate_schema()]] `EXTRACTED`
- [[.continue_generation_session_stream()]] `EXTRACTED`
- [[.get_session()]] `EXTRACTED`
- [[._get_langfuse_handler()]] `EXTRACTED`
- [[.get_model()]] `EXTRACTED`
- [[._llm()]] `EXTRACTED`
- [[.langfuse_client()]] `EXTRACTED`
- [[.__init__()]] `EXTRACTED`

### rationale_for
- [[AI Suggestion Self-Correction Loop]] `EXTRACTED`
- [[Application-layer service for AI-powered content operations.      Responsibiliti]] `EXTRACTED`

### shares_data_with
- [[Schema Generation API Contract]] `EXTRACTED`

### uses
- [[AIAgentSession]] `INFERRED`
- [[DraftingService]] `INFERRED`
- [[RefineService]] `INFERRED`
- [[CopilotService]] `INFERRED`
- [[ConversationMessage]] `INFERRED`
- [[SessionStatus]] `INFERRED`
- [[InvalidSchemaError]] `INFERRED`
- [[AIService]] `INFERRED`
- [[AIBaseRequest]] `INFERRED`
- [[Any]] `INFERRED`
- [[Request]] `INFERRED`
- [[GenerateSchemaRequest]] `INFERRED`
- [[SessionMessageRequest]] `INFERRED`
- [[AsyncSession]] `INFERRED`
- [[FastAPI]] `INFERRED`
- [[CopilotEditRequest]] `INFERRED`
- [[DraftRequest]] `INFERRED`
- [[RefineRequest]] `INFERRED`
- [[MockSchemaGraph]] `INFERRED`
- [[TestClient]] `INFERRED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*