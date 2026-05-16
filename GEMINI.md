<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
/home/itlight/dev/hermes-cms/specs/002-tenant-management/plan.md
<!-- SPECKIT END -->

# Hermes AI — Gemini Agent Context

## Quick Reference

- **Product name**: Hermes AI (always use this in UI, docs, and branding)
- **Constitution**: `.specify/memory/constitution.md` (v2.1.0) — read before any
  architectural decisions
- **Design system**: `DESIGN.md` ("Alexandria — High-End Editorial")
- **Feature spec workflow**: SpecKit skills in `.agents/skills/speckit-*`

## Architecture at a Glance

| Layer             | Tech                                          | Location                    |
| ----------------- | --------------------------------------------- | --------------------------- |
| CMS Monolith      | Payload CMS 3.84+ / Next.js 16.2+ / TS 6.0+  | `apps/cms/`                 |
| AI Microservice   | FastAPI 0.136+ / Python 3.14+ / LangChain 1.2+| `apps/ai-agent-service/`    |
| CMS Database      | PostgreSQL 18 (logical multi-tenancy)          | port 5432 (`hermes_cms`)    |
| AI Database       | PostgreSQL 18 (separate)                       | port 5433 (`hermes_ai`)     |
| Message Broker    | Kafka (Confluent) + Zookeeper                  | port 9092                   |
| Frontend Starters | Next.js / Astro templates                      | `apps/frontend-starters/`   |

## Non-Negotiable Principles (from Constitution)

1. **Multi-tenancy by Default** — Payload ACLs enforce logical tenant isolation.
2. **AI as First-Class Citizen** — Conversational AI agent is the primary content
   creation interface.
3. **API-First** — Strictly headless; REST & GraphQL delivery only.
4. **Test-First (TDD)** — Tests before implementation, always.
5. **DX for Tenants** — Managed starters, predictable APIs, clear docs.
6. **Strict DDD** — Enforced in the AI microservice (domain/application/infrastructure).
7. **Hybrid Architecture** — CMS monolith + Python AI microservice via REST/Kafka.

## Project Structure (Key Paths)

```
hermes-cms/
├── .specify/memory/constitution.md   # Project constitution v2.1.0
├── apps/cms/src/
│   ├── payload.config.ts             # Central Payload config
│   ├── collections/                  # Tenants, Users, APIKeys, ContentTypes,
│   │                                 #   ContentItems, HostedSites
│   ├── components/views/             # LoginPage.tsx, InitPage.tsx (custom admin)
│   ├── components/Editor/            # Rich-text editor components
│   └── app/                          # Next.js routes ((frontend)/(payload))
├── apps/ai-agent-service/src/
│   ├── domain/                       # DDD domain layer
│   ├── application/                  # Application services
│   ├── infrastructure/               # Adapters, persistence
│   └── main.py                       # FastAPI entrypoint
├── docker-compose.yml                # 2× Postgres + Kafka + Zookeeper
├── scripts/start-dev.sh              # One-command local dev startup
├── specs/001-ai-headless-cms/        # Active feature spec + plan + tasks
├── DESIGN.md                         # Alexandria design system tokens
└── docs/architecture.md              # Architecture overview
```

## Development Commands

```bash
# Full stack (recommended)
./scripts/start-dev.sh

# CMS only
cd apps/cms && pnpm dev          # :3000
cd apps/cms && pnpm test         # Jest

# AI service only
cd apps/ai-agent-service
./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
pytest

# Infrastructure
docker-compose up -d             # Start Postgres + Kafka
docker-compose stop              # Stop all containers
```

## Key Tech Versions

| Package / Tool                       | Version    |
| ------------------------------------ | ---------- |
| Payload CMS                          | 3.84+      |
| Next.js                              | 16.2+      |
| React                                | 19.2+      |
| TypeScript                           | 6.0+       |
| Tailwind CSS                         | 4.3        |
| Node.js                              | 26+        |
| pnpm                                 | 11+        |
| Python                               | 3.14+      |
| FastAPI                              | 0.136+     |
| LangChain                            | 1.2+       |
| PostgreSQL                           | 18+        |
| Kafka (Confluent)                    | latest     |

## Payload CMS Collections

`Tenants` · `Users` · `APIKeys` · `ContentTypes` · `ContentItems` · `HostedSites`

Multi-tenancy plugin scopes: `content-types`, `content-items`, `api-keys`.
Super-admin bypass: users with `role === 'super-admin'`.

## Design System ("Alexandria")

- **Primary**: `#094cb2` · **Tertiary/gold**: `#6d5e00`
- **Fonts**: Noto Serif (headlines), Inter (body), Public Sans (labels)
- **Style**: Glassmorphism, gradient CTAs, tonal elevation (no box-shadows),
  no hard borders (ghost borders at 15% opacity max)
- **Corners**: Minimum `sm` roundness — never sharp

## Agent Rules

1. Read `.specify/memory/constitution.md` before architectural work.
2. Never bypass tenant isolation — every query must be tenant-scoped.
3. TDD is mandatory — write tests before implementation.
4. Respect DDD layers in `apps/ai-agent-service/` (domain → application → infrastructure).
5. Use SpecKit workflow for features: specify → plan → tasks → implement.
6. Keep branding consistent: product is "Hermes AI", design is "Alexandria".
7. AI service is provider-agnostic — use LangChain `init_chat_model`, never
   hardcode a specific LLM.
8. CMS ↔ AI auth: `X-Internal-Secret` header.
9. Feature specs live under `specs/<feature-id>/`.
10. **Payload Expertise:** When working with Payload CMS concepts (e.g., payload.config.ts, collections, fields, hooks, access control) in `apps/cms/`, you MUST invoke the `payload` skill first.

## Payload CMS 3.x Custom Components (CRITICAL)
When adding custom React components to `payload.config.ts` (e.g., Dashboards, Graphics, Custom Fields):
1. **Always use Named Exports:** Never use `export default`. Example: `export const MyComponent: React.FC = ...`
2. **Pathing in Config:** Use absolute-style paths starting with `/src/` and append the named export. Example: `'/src/components/views/Dashboard#Dashboard'`.
3. **Manual Import Map Validation:** If the Next.js dev server crashes with a 500 error or `Module not found` related to Payload components, **do not blindly restart the server**. 
   - Inspect `apps/cms/src/app/(payload)/admin/importMap.js`.
   - If the paths are miscalculated (e.g., missing `src/` in the relative path), manually correct the `importMap.js` file to bypass the generator deadlock.
   - Example manual correction: `import { Dashboard as Dashboard_Dashboard } from '../../../../src/components/views/Dashboard'`.

## Payload 3.x & Next.js 15 Technical Guardrails
1. **Dynamic Route Naming:** Always use `[...slug]` for the Payload API catch-all route (`src/app/(payload)/api/[...slug]`). Using `[...payload]` or other names may conflict with internal Payload expectations in Next.js 15+.
2. **Lowercase View Keys:** In `payload.config.ts`, use lowercase keys for standard admin views (e.g., `dashboard`, `login`, `account`). Uppercase keys may be ignored by the Payload 3.x view resolver.
3. **Process Management:** Stale `payload` processes (generators) can consume 100% CPU and lock files. If the system is slow or `importMap.js` fails to update, kill all `node` processes related to `payload` and `next` before retrying.
4. **importMap Regeneration:** Changes to custom component registrations in `payload.config.ts` often require a manual `pnpm payload generate:importmap` if the dev server fails to auto-sync.

## Payload CMS 3.x UI Guardrails (CRITICAL)
When modifying the Payload Admin UI or adding custom components:
1. **Layout Hierarchy:** Never place global components (like `Nav` or `Header`) inside View components (like `Dashboard`). Payload automatically wraps all views in its `RootLayout`. Doing so causes severe duplication and overlapping.
2. **Component Registration:** Global overrides must be registered in `payload.config.ts` under `admin.components`. Strictly follow the expected object syntax (e.g., `header: [ '/src/components/admin/Header#Header' ] as any`).
3. **CSS Safety:** Never aggressively override or hide core Payload layout classes (e.g., `.nav`, `.app-header`, `.template-default__wrap`) using `display: none !important` globally without understanding the flex/grid container consequences.
4. **Sidebar Offsets:** The native Next.js App Router template used by Payload expects an 18rem sidebar. If implementing a custom sidebar, ensure the main content wrapper maintains a `margin-left: 18rem`.
5. **Skill Required:** Any time you are asked to work on or fix the Payload UI, you MUST invoke the `payload-ui` skill first.

