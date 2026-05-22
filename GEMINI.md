<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
/home/itlight/dev/hermes-cms/specs/004-ai-content-drafting/plan.md
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
| CMS Monolith      | Payload CMS 3.84+ / Next.js 16.2+ / TS 6.0+  | `apps/content-management-engine/` |
| Content Authoring Service | FastAPI 0.136+ / Python 3.14+ / LangChain 1.2+| `apps/content-authoring-service/` |
| CMS Database      | PostgreSQL 18 (logical multi-tenancy)          | port 5432 (`hermes_cms`)    |
| Authoring Database| PostgreSQL 18 (separate)                       | port 5433 (`hermes_authoring`) |
| Message Broker    | Kafka (Confluent) + Zookeeper                  | port 9092                   |
| Frontend Starters | Next.js / Astro templates                      | `apps/site-templates/`      |

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
├── apps/content-management-engine/src/
│   ├── payload.config.ts             # Central Payload config
│   ├── collections/                  # Tenants, Users, APIKeys, ContentTypes,
│   │                                 #   ContentItems, HostedSites
│   ├── components/views/             # LoginPage.tsx, InitPage.tsx (custom admin)
│   ├── components/Editor/            # Rich-text editor components
│   └── app/                          # Next.js routes ((frontend)/(payload))
├── apps/content-authoring-service/src/
│   ├── domain/                       # DDD domain layer
│   ├── application/                  # Application services
│   ├── infrastructure/               # Adapters, persistence
│   └── main.py                       # FastAPI entrypoint
├── docker-compose.yml                # 2× Postgres + Kafka + Zookeeper
├── scripts/start-dev.sh              # Full Docker stack startup (Unix)
├── scripts/start-dev.ps1             # Full Docker stack startup (Windows)
├── scripts/start-local.sh            # Infra in Docker + Apps locally (Unix)
├── scripts/start-local.ps1           # Infra in Docker + Apps locally (Windows)
├── specs/001-ai-headless-cms/        # Active feature spec + plan + tasks
├── DESIGN.md                         # Alexandria design system tokens
└── docs/architecture.md              # Architecture overview
```

## Development Commands

```bash
# Full Docker stack
./scripts/start-dev.sh                # Unix
.\scripts\start-dev.ps1               # Windows (PowerShell)

# Local-first (Infra in Docker + Apps locally - Better for hot reload)
./scripts/start-local.sh              # Unix
.\scripts\start-local.ps1             # Windows (PowerShell)

# CMS only
cd apps/content-management-engine && pnpm dev          # :3000
cd apps/content-management-engine && pnpm test         # Jest

# AI service only
cd apps/content-authoring-service
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
4. Respect DDD layers in `apps/content-authoring-service/` (domain → application → infrastructure).
5. Use SpecKit workflow for features: specify → plan → tasks → implement.
6. Keep branding consistent: product is "Hermes AI", design is "Alexandria".
7. AI service is provider-agnostic — use LangChain `init_chat_model`, never
   hardcode a specific LLM.
8. CMS ↔ AI auth: `X-Internal-Secret` header.
9. Feature specs live under `specs/<feature-id>/`.
10. **Payload CMS & UI Safety (with Pre-Commit Hook Enforcement):** When working with Payload CMS concepts (e.g., payload.config.ts, collections, fields, hooks, access control, custom endpoints) or making UI/UX modifications to the admin interface in `apps/content-management-engine/`, you MUST invoke the unified `payload` skill (located in `.agents/skills/payload/SKILL.md`) first. An automated git pre-commit hook is active; if staged files contain changes under `apps/content-management-engine/`, it reminds/enforces that you have invoked and followed this skill before you commit. Always check the Alexandria Layout & Admin UI Guardrails section in the skill, verify whether the custom view is auto-wrapped by the framework's default templates, and apply deep-ancestor `:has()` CSS overrides in `globals.css` to prevent layout gaps.


## Payload CMS 3.x Custom Components (CRITICAL)
When adding custom React components to `payload.config.ts` (e.g., Dashboards, Graphics, Custom Fields):
1. **Always use Named Exports:** Never use `export default`. Example: `export const MyComponent: React.FC = ...`
2. **Pathing in Config:** Use absolute-style paths starting with `/src/` and append the named export. Example: `'/src/components/views/Dashboard#Dashboard'`.
3. **Manual Import Map Validation:** If the Next.js dev server crashes with a 500 error or `Module not found` related to Payload components, **do not blindly restart the server**. 
   - Inspect `apps/content-management-engine/src/app/(payload)/admin/importMap.js`.
   - If the paths are miscalculated (e.g., missing `src/` in the relative path), manually correct the `importMap.js` file to bypass the generator deadlock.
   - Example manual correction: `import { Dashboard as Dashboard_Dashboard } from '../../../../src/components/views/Dashboard'`.

## Payload 3.x & Next.js 15 Technical Guardrails
1. **Dynamic Route Naming:** Always use `[...slug]` for the Payload API catch-all route (`src/app/(payload)/api/[...slug]`). Using `[...payload]` or other names may conflict with internal Payload expectations in Next.js 15+.
2. **Lowercase View Keys:** In `payload.config.ts`, use lowercase keys for standard admin views (e.g., `dashboard`, `login`, `account`). Uppercase keys may be ignored by the Payload 3.x view resolver.
3. **Process Management:** Stale `payload` processes (generators) can consume 100% CPU and lock files. If the system is slow or `importMap.js` fails to update, kill specific non-agent node/next processes. **CRITICAL WARNING:** NEVER use `pkill -f "node"` or other generic node killing commands, as this will terminate the current coding session and communication with the AI agent. Use targeted process termination instead (e.g., `pkill -f "next-router-worker"` or find specific PIDs).
4. **importMap Regeneration:** Changes to custom component registrations in `payload.config.ts` often require a manual `pnpm payload generate:importmap` if the dev server fails to auto-sync.
5. **WSL 2 Compiler Stability & Webpack Opt-in:** Next.js 16/Turbopack dev server has known compilation deadlocks when compiling Payload CMS catch-all views on WSL 2, resulting in CPU hangs and system freezes. To ensure development stability, the dev server script must use the Webpack builder via the `--webpack` flag: e.g., `next dev --webpack`. Do NOT remove the `--webpack` flag in WSL 2 workspace environments.
6. **Circular Import Loop Prevention:** Standalone custom views registered in `payload.config.ts` must NEVER import layout templates from `@payloadcms/next/templates` or `@payloadcms/next/views` (such as `DefaultTemplate`). Because these standard templates depend recursively on the core config, importing them inside custom view components creates a compiler circular dependency loop that freezes the bundler. Standalone custom views should instead use a minimal wrapper layout (such as `AdminView`) that implements layout structure without circular references.

## Payload CMS 3.x UI Guardrails (CRITICAL)
When modifying the Payload Admin UI or adding custom components:
1. **Mandatory Skill:** ALWAYS invoke the unified `payload` skill first (located in `.agents/skills/payload/SKILL.md`). It contains the project-specific Alexandria layout tokens (18rem sidebar, 5rem header) and detailed UI guardrails.
2. **View Wrapper Distinctions (Critical)**:
   - **Standalone Custom Views** (registered under `admin.components.views` on the admin router) MUST use the `AdminView` component (`src/components/admin/AdminView.tsx`).
   - **Collection-level custom views** (registered under `collections[X].admin.components.views` like `list` or `edit.default`) are automatically wrapped by the framework. **DO NOT** use the `AdminView` or `DefaultTemplate` wrapper inside the custom component itself, as this results in a duplicate 18rem margin shift layout bug.
3. **CSS Isolation & Parent Resets:** Ensure your custom view content is wrapped in a designated isolation class (e.g., `.custom-editor-view`). In `globals.css`, write a deep-ancestor reset rule using the `:has()` selector to strip all padding, margins, and max-widths from the default Payload container tree.
4. **Verification:** Always check `src/app/(payload)/admin/importMap.js` and verify that the sidebar, header, and visual canvas sit completely flush without overlapping or horizontal/vertical whitespace gaps.


