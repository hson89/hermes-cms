<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
/home/itlight/dev/hermes-cms/specs/002-tenant-management/plan.md
<!-- SPECKIT END -->

# Hermes AI — Agent Guidelines

## Project Identity

**Hermes AI** is a multi-tenant, AI-powered headless CMS. The product name is
"Hermes AI" everywhere — branding, UI copy, meta tags, and documentation.

## Constitution (Source of Truth)

The project constitution lives at `.specify/memory/constitution.md` (v2.1.0).
Every architectural decision, feature implementation, and code review **must**
comply with these seven non-negotiable principles:

1. **Multi-tenancy by Default** — Logical isolation via Payload CMS ACLs; every
   query is tenant-scoped.
2. **AI as a First-Class Citizen** — The conversational AI agent is the primary
   content creation interface, not a bolt-on.
3. **API-First Content Delivery** — Strictly headless; REST & GraphQL delivery
   endpoints only.
4. **Test-First (TDD)** — Tests before implementation. Focus on tenant isolation,
   AI orchestration, and API performance.
5. **Developer Experience (DX)** — Frictionless onboarding for tenant developers
   via managed starters and predictable APIs.
6. **Strict Domain-Driven Design (DDD)** — Bounded contexts, aggregates, entities,
   and value objects — especially in the AI microservice.
7. **Hybrid Architecture** — Payload CMS monolith + independent Python AI
   microservice communicating via REST/Kafka.

## Architecture Overview

```
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│  Payload CMS Monolith            │    │  AI Agent Microservice           │
│  (Node.js / Next.js 16+)        │◄──►│  (Python 3.14+ / FastAPI 0.136+) │
│                                  │REST│                                  │
│  • PostgreSQL 18+ (port 5432)    │    │  • PostgreSQL 18+ (port 5433)    │
│  • Payload 3.84+ w/ multi-tenant │    │  • LangChain 1.2+ / multi-LLM   │
│  • Lexical rich-text editor      │    │  • DDD layered architecture      │
│  • Tailwind CSS 4.3              │    │  • SQLAlchemy + Alembic          │
└──────────────────────────────────┘    └──────────────────────────────────┘
              ▲                                      ▲
              │                                      │
      Kafka (port 9092) ─── async events ────────────┘
```

## Repository Structure

```
hermes-cms/
├── .specify/memory/          # Project constitution & memory
├── apps/
│   ├── cms/                  # Payload CMS (Next.js App Router)
│   │   ├── src/
│   │   │   ├── app/          # Next.js routes ((frontend) & (payload) groups)
│   │   │   ├── collections/  # Tenants, Users, APIKeys, ContentTypes,
│   │   │   │                 #   ContentItems, HostedSites
│   │   │   ├── components/   # React components (Editor/, views/)
│   │   │   ├── services/     # Internal service layer
│   │   │   ├── payload.config.ts
│   │   │   └── payload-types.ts  # Auto-generated types
│   │   └── tests/
│   ├── ai-agent-service/     # FastAPI AI microservice
│   │   ├── src/
│   │   │   ├── domain/       # DDD domain layer
│   │   │   ├── application/  # Application services
│   │   │   ├── infrastructure/ # Adapters & persistence
│   │   │   └── main.py       # FastAPI entrypoint
│   │   └── tests/
│   └── frontend-starters/    # Managed deploy templates (Next.js, Astro)
├── docker/                   # Dockerfiles (Dockerfile.cms, Dockerfile.ai)
├── docker-compose.yml        # Local dev infra (2× Postgres, Kafka, Zookeeper)
├── docs/architecture.md      # High-level architecture doc
├── k8s/                      # Kubernetes manifests
├── scripts/start-dev.sh      # One-command local dev startup
├── specs/001-ai-headless-cms/ # Feature spec, plan, tasks, data model, contracts
├── DESIGN.md                 # "Alexandria" design system tokens
└── README.md
```

## Technology Stack

### CMS (apps/cms)
| Concern        | Technology                             |
| -------------- | -------------------------------------- |
| Framework      | Payload CMS 3.84+ on Next.js 16.2+    |
| Language       | TypeScript 6.0+                        |
| Database       | PostgreSQL 18 (logical multi-tenancy)  |
| Editor         | Lexical (rich-text, block-based JSON)  |
| Styling        | Tailwind CSS 4.3                       |
| Multi-tenancy  | `@payloadcms/plugin-multi-tenant`      |
| Package mgr    | pnpm 11+                               |
| Testing        | Jest 30, Playwright 1.59               |

### AI Microservice (apps/ai-agent-service)
| Concern        | Technology                             |
| -------------- | -------------------------------------- |
| Framework      | FastAPI 0.136+                         |
| Language       | Python 3.14+                           |
| LLM            | LangChain 1.2+ (multi-provider)       |
| Providers      | OpenAI, Anthropic, Google, Mistral     |
| Database       | PostgreSQL 18 (separate, port 5433)    |
| ORM            | SQLAlchemy 2.0+ / Alembic             |
| Testing        | pytest 8.4+, httpx                     |

### Infrastructure
| Concern        | Technology                             |
| -------------- | -------------------------------------- |
| Containers     | Docker / Docker Compose                |
| Orchestration  | Kubernetes (k8s/ manifests)            |
| Message broker | Kafka (Confluent) + Zookeeper          |

## Design System

The visual language is codename **"Alexandria — High-End Editorial"**.
Refer to `DESIGN.md` at the project root for full token definitions:
- Primary: `#094cb2`, Tertiary/gold: `#6d5e00`
- Fonts: Noto Serif (headlines), Inter (body), Public Sans (labels)
- Glassmorphism floating menus, gradient CTAs, no hard borders
- Tonal elevation via surface tokens, not box-shadows

## Development Commands

```bash
# Start everything (Docker infra + CMS + AI service)
./scripts/start-dev.sh

# CMS only (from apps/cms/)
pnpm dev           # Next.js dev server on :3000
pnpm test          # Jest unit tests

# AI service only (from apps/ai-agent-service/)
./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
pytest              # Python tests

# Infrastructure only
docker-compose up -d   # Postgres ×2 + Kafka + Zookeeper
docker-compose stop
```

## Service Endpoints (Local Dev)

| Service         | URL / Port                        |
| --------------- | --------------------------------- |
| CMS Admin       | http://localhost:3000/admin        |
| CMS Login       | http://localhost:3000/admin/login  |
| AI Health       | http://localhost:8000/health       |
| CMS Postgres    | localhost:5432 (hermes_cms)        |
| AI Postgres     | localhost:5433 (hermes_ai)         |
| Kafka broker    | localhost:9092                     |

## Key Collections (Payload CMS)

- **Tenants** — Organizational accounts; root of all isolation.
- **Users** — Tenant-scoped users with roles (`super-admin`, `admin`, `editor`).
- **APIKeys** — Tenant-scoped credentials for delivery API auth.
- **ContentTypes** — Dynamic schema definitions per tenant.
- **ContentItems** — Content instances bound to a ContentType.
- **HostedSites** — Managed front-end deployments.

## Custom Admin Views

- **LoginPage** — Custom branded login (`/src/components/views/LoginPage.tsx`)
- **InitPage** — First-user creation flow (`/src/components/views/InitPage.tsx`)

## Rules for AI Agents

1. **Always read the constitution** (`.specify/memory/constitution.md`) before
   making architectural decisions.
2. **Never bypass tenant isolation** — every data query must be tenant-scoped.
3. **Write tests first** — TDD is non-negotiable per the constitution.
4. **Respect DDD layers** in the AI microservice — domain logic stays in `domain/`,
   application orchestration in `application/`, adapters in `infrastructure/`.
5. **Use the SpecKit workflow** for new features: specify → plan → tasks → implement.
   Skills live in `.agents/skills/speckit-*`.
6. **Keep the design system** ("Alexandria") consistent — see `DESIGN.md`.
7. **Don't hardcode LLM providers** — the AI service uses LangChain's
   `init_chat_model` for provider-agnostic LLM switching.
8. **Internal service auth** uses `X-Internal-Secret` header between CMS ↔ AI.
9. Feature specs go under `specs/<feature-id>/` with `spec.md`, `plan.md`,
   `tasks.md`, and supporting artifacts.
10. **Payload UI Safety:** Any UI/UX modifications to the Payload admin interface *must* begin by invoking the `payload-ui` skill (located in `.agents/skills/payload-ui/SKILL.md`) to prevent layout and configuration breakages.
11. **Payload CMS Expertise:** When working with Payload CMS backend concepts (e.g., payload.config.ts, collections, fields, hooks, access control, custom endpoints) in `apps/cms/`, you MUST invoke the `payload` skill (located in `.agents/skills/payload/SKILL.md`) first.

### Payload CMS 3.x Custom Components (CRITICAL)
When adding custom React components to `payload.config.ts`:
- **Named Exports Only:** Never use `export default`.
- **Explicit Paths:** Use absolute-style paths starting with `/src/` and append the named export (e.g., `'/src/components/views/Dashboard#Dashboard'`).
- **importMap Verification:** If the build fails with `Module not found` in `importMap.js`, manually patch the relative paths in `apps/cms/src/app/(payload)/admin/importMap.js` to include the `src/` directory.

### Payload 3.x & Next.js 15 Technical Guardrails
1. **Dynamic Route Naming:** Always use `[...slug]` for the Payload API catch-all route (`src/app/(payload)/api/[...slug]`). Using `[...payload]` or other names may conflict with internal Payload expectations in Next.js 15+.
2. **Lowercase View Keys:** In `payload.config.ts`, use lowercase keys for standard admin views (e.g., `dashboard`, `login`, `account`). Uppercase keys may be ignored by the Payload 3.x view resolver.
3. **Process Management:** Stale `payload` processes (generators) can consume 100% CPU and lock files. If the system is slow or `importMap.js` fails to update, kill specific non-agent node/next processes. **CRITICAL WARNING:** NEVER use `pkill -f "node"` or other generic node killing commands, as this will terminate the current coding session and communication with the AI agent. Use targeted process termination instead (e.g., `pkill -f "next-router-worker"` or find specific PIDs).
4. **importMap Regeneration:** Changes to custom component registrations in `payload.config.ts` often require a manual `pnpm payload generate:importmap` if the dev server fails to auto-sync.

