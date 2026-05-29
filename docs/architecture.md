# Hermes AI — Architecture Specification

## Overview

Hermes AI utilizes a modular, hybrid architecture designed for enterprise-grade headless content management with native, first-class AI orchestration. The platform splits responsibilities between a high-efficiency **Payload CMS Monolith** (handling UI, collections, multi-tenancy, and session persistence) and an independent **FastAPI AI Microservice** (handling LangChain orchestration, tool invocation, and LLM provider abstractions).

---

## Architectural Schema

```
                  ┌───────────────────────────────────────────────┐
                  │          Content Management Engine            │
                  │          (Payload CMS / Next.js 16)           │
                  │              Port: 3000 (Local)               │
                  └──────────────────────┬────────────────────────┘
                                         │
                                   REST / SSE / JSON
                          Header: X-Internal-Secret (Secure)
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │           Content Authoring Service           │
                  │             (FastAPI / Python 3.14)           │
                  │              Port: 8000 (Local)               │
                  └──────────────────────┬────────────────────────┘
                                         │
                                 LangChain 1.2+ SDK
                                         │
                                         ▼
                  ┌───────────────────────────────────────────────┐
                  │                 Langfuse UI                   │
                  │           (Distributed Tracing / Prompts)      │
                  │              Port: 3003 (Local)               │
                  └───────────────────────────────────────────────┘
```

---

## Primary Components

### 1. Content Management Engine (CMS Monolith)
* **Framework:** Payload CMS 3.84+ built on Next.js 16.2+ and TypeScript 6.0+.
* **Database:** PostgreSQL 18 (Local port `5432` / DB: `hermes_cms`).
* **Responsibilities:**
  * **Logical Multi-tenancy:** Handled at the database query layer via `@payloadcms/plugin-multi-tenant`. Every query is scoped to the tenant ID of the authenticated context, ensuring 0% cross-tenant data bleed.
  * **Bespoke UI (Alexandria):** Branded, high-end editorial admin interface featuring Outfit/Noto Serif/Public Sans typography, glassmorphism overlays, and zero-border elevations.
  * **Dynamic Content Types & Items:** Relies on dynamic Payload Collection configurations to deliver REST and GraphQL endpoints.
  * **Session Persistence:** Manages active draft state and version rollback histories (up to 10 versions) in the `DraftingSessions` collection.

### 2. Template Builder Engine
* **Framework:** Custom Payload Admin View using `dnd-kit` and React 19.2+.
* **Responsibilities:**
  * **Visual Assembly:** Allows Content Architects to drag and drop registered building blocks into a canvas to design page layouts.
  * **Schema Association:** Provides a mapping interface to bind block properties (from the Block Registry) to Content Type fields.
  * **Resolution Engine (Hydration):** A server-side service (`TemplateService`) that joins Content Item data with Page Template structures to deliver a "Hydrated Block Tree" (JSON) to frontend applications via `GET /api/content/[id]/hydrate`.
  * **Deployment Webhooks:** Triggers synchronization events to `HostedSites` when templates are published, using the `TemplateDeployments` collection for history.

### 3. Content Authoring Service (AI Microservice)
* **Framework:** FastAPI 0.136+ (Python 3.14+).
* **LLM Engine:** LangChain 1.2+ with provider-agnostic switching (via `init_chat_model`).
* **Database:** PostgreSQL 18 (Local port `5433` / DB: `hermes_authoring`) via SQLAlchemy 2.0 and Alembic.
* **Responsibilities:**
  * **Generative Drafting & Schema Modeling:** Handles natural language instructions to dynamically create and populate database fields.
  * **Self-Healing Output Recovery:** Intercepts malformed or invalid LLM JSON outputs and automatically triggers corrective formatting loops (max 3 retries) using a secondary healing chain.
  * **Conversational Context:** Tracks AI chat history in the local `AIAgentSession` table model for conversational consistency across turn sequences.
  * **Native Agent Tools:** Connects to native LangChain tools including `schema_resolver` (safely looking up CMS structures) and `image_generator` (orchestrating media creation).

---

## Core Architectural Flows

### 1. Server-Sent Events (SSE) content drafting
The real-time streaming content drafting workspace uses standard unidirectional HTTP Server-Sent Events (SSE):
1. The **CMS Engine UI** initiates a drafting request by sending a prompt and active editor locale to the Next.js API proxy `/api/ai/draft`.
2. The **Next.js SSE Proxy** validates the active user session and rate limits, resolves the tenant's default LLM config, and relays the request to the FastAPI AI microservice `/api/ai/draft` endpoint.
3. The **AI Microservice** spins up an asynchronous FastAPI streaming generator (`async def`), parsing provider models and injecting locale instructions.
4. As the model streams, it emits structured events (`TEXT_DELTA`, `FIELD_START`, `FIELD_COMPLETE`, `DRAFT_COMPLETE`).
5. The **Next.js Proxy** intercepts the stream:
   - Evaluates client disconnects (`req.on('close')`) and proactively aborts the downstream FastAPI HTTP request using standard abort signals.
   - Server-side translates generated Markdown bodies into Payload's Lexical JSON format using `@payloadcms/richtext-lexical` parser utilities on stream completion.
   - Saves incremental snapshots to the `DraftingSessions` collection in PostgreSQL, updating the `lastActivityAt` lock timestamp.
6. The **CMS UI** renders raw Markdown during active streaming and initializes the interactive Lexical editor immediately on stream completion.

### 2. Single-User Session Locking & Recovery
To prevent concurrent editing conflicts while preserving data safety:
* Only one user can have an `'active'` session for a specific content schema inside a tenant.
* A compound partial unique index on PostgreSQL `(tenant, contentType)` WHERE `(status = 'active')` guarantees this isolation.
* A 10-minute inactivity timeout releases the lock by transitioning the session `status` from `'active'` to `'expired'`, retaining the draft data for a **24-Hour Recovery Window**.
* To bypass cron execution latency, both the lock-checking routes and active DB hooks dynamically evaluate `lastActivityAt` on read/write attempts. If `now - lastActivityAt > 10 minutes`, the lock is treated as expired on-the-fly, allowing new sessions to initialize atomically.
* When returning within 24 hours, the user is greeted with a glassmorphic **Recovery Dialog** offering to resume the draft or start fresh (which triggers a `DELETE` request to purge the expired session).

### 3. Distributed Tracing & Prompt Management (Langfuse)
Distributed tracing and version control coordinate seamlessly across both microservices:
1. **CMS Engine Tracing:** Next.js establishes a parent trace in Langfuse, recording user context, tenant ID, and prompt inputs.
2. **Propagation Header:** The parent trace ID is passed to the AI microservice via the `langfuse_trace_id` request parameter.
3. **AI Microservice Binding:** FastAPI intercepts the parent ID and binds it to LangChain's callback handler (`CallbackHandler(trace_context={"trace_id": trace_id})`). Every intermediate tool execution, prompt cost, and token completion is grouped under the parent tree in the Langfuse UI.
4. **Dynamic Prompts:** System prompts are decoupled from Python code and loaded dynamically from Langfuse (`schema-generation-system`, `content-drafting-system`, `copilot-system`, `content-healing-system`). If the Langfuse server is unreachable, the AI service automatically falls back to local hardcoded templates defined in `src/domain/content_drafting/prompts.py`.

### 4. Postgres-Backed Sliding-Window Rate Limiting
To prevent credit consumption abuse and control server cost:
* A strict rate limit of **10 AI requests/refinements per minute per user** is enforced.
* It is backed by a global, user-scoped `AIRateLimits` collection. This collection resides outside the multi-tenancy filter (bypassing tenant checks via the `overrideAccess: true` local API configuration) to enforce a true platform-wide user limit.
* A PostgreSQL index on `(userId, timestamp)` ensures sub-millisecond query execution.
* Batch refinement actions (such as "Refine All" parallel section edits) consume only **1 rate limit token** for the entire batch operation, aggregating all sub-request costs into a single `AIAuditLogs` record recorded in microdollars ($1 = 1,000,000 microdollars) to prevent rate-limit exhaustion.

---

## Inter-Service Security
All backend communications between the Next.js CMS Engine and the Python AI Microservice are secured via:
* **HTTP Header Verification:** Requests MUST carry the `X-Internal-Secret` header.
* **Secret Configuration:** The value is matched dynamically against the standard `INTERNAL_SERVICE_SECRET` environment variable defined on both containers.
