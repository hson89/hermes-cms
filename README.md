# Hermes AI — Headless CMS

Hermes AI is a multi-tenant, AI-powered headless CMS designed to accelerate content creation and delivery. It combines a state-of-the-art Next.js & Payload CMS monolith with an independent Python FastAPI AI microservice to provide generative schema design, intelligent inline copilot editing, and conversational content drafting.

## Architecture

The project follows a hybrid architecture:
* **Content Management Engine (`apps/content-management-engine`)**: A Payload CMS (TypeScript / Next.js) monolith that handles structured content modeling, logical tenant isolation, user role access, API key delivery, and the Alexandria-style admin dashboard.
* **Content Authoring Service (`apps/content-authoring-service`)**: A FastAPI Python microservice leveraging LangChain 1.2+ and multi-provider LLM integrations to handle complex schema reasoning, tool orchestration, and content generation.
* **Site Templates (`apps/site-templates`)**: Preconfigured Next.js and Astro deployment starters managed directly from the CMS dashboard.

For deep-dive documentation, see [docs/architecture.md](file:///home/itlight/dev/hermes-cms/docs/architecture.md).

---

## Observability & Prompt Management (Langfuse)

Hermes AI leverages **Langfuse** for enterprise-grade LLM observability, distributed tracing, and prompt version control. Tracing is deeply integrated into both microservices to provide end-to-end transparency.

### 1. Distributed Tracing Flow
Distributed tracing coordinates across service boundaries:
1. **CMS Engine:** When a user triggers an AI action, the Next.js backend initiates a parent trace, recording input arguments, user context, and tenant ID.
2. **REST API Propagation:** The CMS forwards this trace ID via `langfuse_trace_id` in the API request payload to the Content Authoring Service.
3. **AI Microservice:** The FastAPI application intercepts the trace ID and binds it to LangChain's callback handler (`CallbackHandler(trace_context={"trace_id": trace_id})`).
4. **LLM Evaluation:** Every intermediate tool call, token cost calculation, and final generation is linked under the parent trace, rendering as a single unified visual execution tree in the Langfuse dashboard.

### 2. Dynamic Prompt Management
All primary system prompts are decoupled from the code and managed dynamically in Langfuse. This allows content strategists to iterate on prompt copy without triggering a application deployment:
* `content-drafting-system` / `content-drafting-user` (System & user drafting templates)
* `content-refinement-system` / `content-refinement-user` (System & user refinement templates)
* `schema-generation-system` (Co-creation system schema builder)
* `copilot-system` (Inline section rewrite system editor)
* `content-healing-system` (JSON structure recovery formatter)

If the Langfuse server is offline or unreachable, the services will **gracefully fall back** to hardcoded local default templates defined in `src/domain/content_drafting/prompts.py`, ensuring robust off-grid developer workflows.

---

## Local Development Startup

Start the full stack (infrastructure, CMS, and AI microservices) concurrently using one of our one-command scripts:

### A. Local-First Run (Apps locally, DB/Kafka in Docker — Recommended)
Highly recommended for active coding and hot reloading. Run this from the root directory:
```bash
# Start Docker infra (PostgreSQL ×2, Kafka) + launch Next.js CMS and FastAPI AI service locally
./scripts/start-local.sh
```
*To skip launching the local Langfuse UI stack:*
```bash
./scripts/start-local.sh --no-langfuse
```

### B. Full Containerized Stack (All services in Docker)
Best for staging, environment validation, or production tests:
```bash
./scripts/start-dev.sh
```

---

## Service Dashboard Directory

When running locally, you can access individual service components at:

| Component | URL / Port | Purpose |
| :--- | :--- | :--- |
| **Engine Admin Portal** | [http://localhost:3000/admin](http://localhost:3000/admin) | Payload CMS schema builder, content editor, and dashboard |
| **Authoring Health** | [http://localhost:8000/health](http://localhost:8000/health) | FastAPI microservice health monitoring |
| **Langfuse UI** | [http://localhost:3003](http://localhost:3003) | Observability dashboard, prompt editor, and tracing |
| **Next.js Blog Starter** | [http://localhost:3001](http://localhost:3001) | Managed Next.js frontend template |
| **Astro Portfolio Starter**| [http://localhost:3002](http://localhost:3002) | Managed Astro frontend template |
