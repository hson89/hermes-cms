<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
/home/itlight/dev/hermes-cms/specs/009-template-deployment-history/plan.md
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
│  Payload CMS Monolith            │    │  Content Authoring Service       │
│  (Python 3.14+ / FastAPI 0.136+) │◄──►│  (Python 3.14+ / FastAPI 0.136+) │
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
│   ├── content-management-engine/ # Content Management Engine (Next.js App Router)
│   │   ├── src/
│   │   │   ├── app/          # Next.js routes ((frontend) & (payload) groups)
│   │   │   ├── collections/  # Tenants, Users, APIKeys, ContentTypes,
│   │   │   │                 #   ContentItems, HostedSites
│   │   │   ├── components/   # React components (Editor/, views/)
│   │   │   ├── services/     # Internal service layer
│   │   │   ├── payload.config.ts
│   │   │   └── payload-types.ts  # Auto-generated types
│   │   └── tests/
│   ├── content-authoring-service/ # FastAPI Content Authoring microservice
│   │   ├── src/
│   │   │   ├── domain/       # DDD domain layer
│   │   │   ├── application/  # Application services
│   │   │   ├── infrastructure/ # Adapters & persistence
│   │   │   └── main.py       # FastAPI entrypoint
│   │   └── tests/
│   └── site-templates/       # Managed deploy templates (Next.js, Astro)
├── docker/                   # Dockerfiles (Dockerfile.engine, Dockerfile.authoring)
├── docker-compose.yml        # Local dev infra (2× Postgres, Kafka, Zookeeper)
├── docs/architecture.md      # High-level architecture doc
├── k8s/                      # Kubernetes manifests
├── scripts/start-dev.sh      # One-command local dev startup (Unix)
├── scripts/start-dev.ps1     # One-command local dev startup (Windows)
├── specs/006-template-builder/ # Feature spec, plan, tasks, data model, contracts
├── DESIGN.md                 # "Alexandria" design system tokens
└── README.md
```

## Technology Stack

### Content Management Engine (apps/content-management-engine)
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

### Content Authoring Service (apps/content-authoring-service)
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
- Fonts: Noto Serif (headlines), Inter (body & labels)
- Glassmorphism floating menus, gradient CTAs, no hard borders
- Tonal elevation via surface tokens, not box-shadows

## Development Commands

```bash
# Start everything (Docker infra + CMS + AI service)
./scripts/start-dev.sh         # Unix
.\scripts\start-dev.ps1        # Windows (PowerShell)

# Content Management Engine only (from apps/content-management-engine/)
pnpm dev           # Next.js dev server on :3000
pnpm test          # Jest unit tests

# Content Authoring service only (from apps/content-authoring-service/)
./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
pytest              # Python tests

# Infrastructure only
docker-compose up -d   # Postgres ×2 + Kafka + Zookeeper
docker-compose stop
```

## Service Endpoints (Local Dev)

| Service         | URL / Port                        |
| --------------- | --------------------------------- |
| Engine Admin    | http://localhost:3000/admin        |
| Engine Login    | http://localhost:3000/admin/login  |
| Authoring Health| http://localhost:8000/health       |
| Engine Postgres | localhost:5432 (hermes_cms)        |
| Authoring Postgres | localhost:5433 (hermes_authoring) |
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
10. **Payload CMS & UI Safety (with Pre-Commit Hook Enforcement):** When working with Payload CMS backend concepts (e.g., payload.config.ts, collections, fields, hooks, access control, custom endpoints) or making UI/UX modifications/custom views in `apps/content-management-engine/`, you MUST invoke the unified `payload` skill (located in `.agents/skills/payload/SKILL.md`) first. An automated git pre-commit hook is active; if staged files contain changes under `apps/content-management-engine/`, it reminds/enforces that you have invoked and followed this skill before you commit. Always check the Alexandria Layout & Admin UI Guardrails section in the skill, verify whether the custom view is auto-wrapped by the framework's default templates, and apply deep-ancestor `:has()` CSS overrides in `globals.css` to prevent double-nesting and layout spacing gaps.

### TypeScript Safe Casting Spectrum (Strictly Avoid 'as any')
When dealing with dynamic database schemas, local payload requests, or out-of-sync type unions in `payload-types.ts`, you MUST use the **TypeScript Safe Casting Spectrum** instead of `as any`:
- **`as never` (Bottom-Type):** Use solely on locally mismatched string constants (like out-of-sync collection slugs `collection: 'new-collection' as never`) to preserve strict type validation on all adjacent options (like `data` or `where` filters).
- **`Record<string, unknown> / unknown`:** Use for arbitrary dynamic JSON shapes to enforce writing runtime type guards (like `typeof` checks) instead of bypassing compilation checks.
- **Double Casting (`as unknown as T`):** Use solely when you know the runtime payload structure matches but the compiler cannot structurally unify them (e.g. `req as unknown as PayloadRequest` inside Next.js routes).

### Payload CMS 3.x Custom Components (CRITICAL)
When adding custom React components to `payload.config.ts`:
- **Named Exports Only:** Never use `export default`.
- **Explicit Paths:** Use absolute-style paths starting with `/src/` and append the named export (e.g., `'/src/components/views/Dashboard#Dashboard'`).
- **importMap Verification:** If the build fails with `Module not found` in `importMap.js`, manually patch the relative paths in `apps/content-management-engine/src/app/(payload)/admin/importMap.js` to include the `src/` directory.

### Payload 3.x & Next.js 15 Technical Guardrails
1. **Dynamic Route Naming:** Always use `[...slug]` for the Payload API catch-all route (`src/app/(payload)/api/[...slug]`). Using `[...payload]` or other names may conflict with internal Payload expectations in Next.js 15+.
2. **Lowercase View Keys:** In `payload.config.ts`, use lowercase keys for standard admin views (e.g., `dashboard`, `login`, `account`). Uppercase keys may be ignored by the Payload 3.x view resolver.
3. **Process Management:** Stale `payload` processes (generators) can consume 100% CPU and lock files. If the system is slow or `importMap.js` fails to update, kill specific non-agent node/next processes. **CRITICAL WARNING:** NEVER use `pkill -f "node"` or other generic node killing commands, as this will terminate the current coding session and communication with the AI agent. Use targeted process termination instead (e.g., `pkill -f "next-router-worker"` or find specific PIDs).
4. **importMap Regeneration:** Changes to custom component registrations in `payload.config.ts` often require a manual `pnpm payload generate:importmap` if the dev server fails to auto-sync.
5. **WSL 2 Compiler Stability & Webpack Opt-in:** Next.js 16/Turbopack dev server has known compilation deadlocks when compiling Payload CMS catch-all views on WSL 2, resulting in CPU hangs and system freezes. To ensure development stability, the dev server script must use the Webpack builder via the `--webpack` flag: e.g., `next dev --webpack`. Do NOT remove the `--webpack` flag in WSL 2 workspace environments.
6. **Circular Import Loop Prevention:** Standalone custom views registered in `payload.config.ts` must NEVER import layout templates from `@payloadcms/next/templates` or `@payloadcms/next/views` (such as `DefaultTemplate`). Because these standard templates depend recursively on the core config, importing them inside custom view components creates a compiler circular dependency loop that freezes the bundler. Standalone custom views should instead use a minimal wrapper layout (such as `AdminView`) that implements layout structure without circular references.
7. **Cache-Bust Static Media Assets:** When seeding or updating static preview assets (such as template thumbnails or logos), always assign a new, unique, cache-busting filename (e.g., appending version names or content hashes like `aurelian_discovery_v2_thumbnail.png`). This forces Next.js router cache and browser caches to load the updated image instantly.
8. **Check for Duplicate Image Overlaps:** Before copying or linking visual assets, inspect their checksums (MD5) or URLs to ensure they are visually distinct and not duplicate content mapped to different context templates.
9. **PostgreSQL Relational Null Queries:** For relationship fields in PostgreSQL-backed Payload collections, use `{ field: { equals: null } }` instead of `{ field: { exists: false } }` to check for empty relations in access control queries.
10. **Graceful DB Connection Termination:** Scripts that initialize the local Payload API (`getPayload()`) must explicitly invoke database pool destruction or call `process.exit(0)` to prevent the server process from hanging as an active background task.
11. **Parameterize Seeding Templates & Dynamic Render:** When seeding HTML page templates, do not use hardcoded strings for content fields. Always use double-curly-brace placeholders (e.g., `{{ title }}`) and escape dollar signs (e.g., `\${{ price }}`) inside JavaScript/TypeScript template literals. Ensure site templates (Next.js/Astro) query the active template dynamically (e.g., via `fetchActiveTemplateForSite`) and interpolate all placeholders (including custom `fieldsData` properties) at render time.


