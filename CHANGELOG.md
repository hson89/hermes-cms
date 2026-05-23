# Changelog

All notable changes to the **Hermes AI** project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses standard Conventional Commits.

---

## [0.4.0] - 2026-05-23
### AI Content Drafting Feature Track (`004-ai-content-drafting`)

This feature track transforms the **Hermes AI** CMS into a comprehensive, "AI-First" content creation platform by introducing a split-view content drafting workspace. The system allows conversational AI agents in the left panel to populate a structured editor in the right panel in real-time using unidirectional Server-Sent Events (SSE). The feature introduces single-user session locking, Postgres-backed sliding-window rate limiting, tenant-scoped branding and tone configurations (Style Modifiers), snapshot-based iteration version history, and distributed Langfuse tracing.

> [!NOTE]
> All architectural modifications are fully validated under a rigorous Test-Driven Development (TDD) cycle, adding Jest, pytest, and Playwright coverage for a total of **79/79 passing unit, integration, and proxy contract tests** verifying logical isolation, rate limiting window compliance, and stream abort propagation.

---

### Added

#### 1. Core Data Models & Collections (`apps/content-management-engine/src/collections/`)
- **[NEW] `DraftingSessions` Collection** ([DraftingSessions](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/DraftingSessions/index.ts)): Stores active draft state, metadata context, active locales, and version snapshot histories (capped at 10). Registers validation hooks for:
  - `validateLock.ts`: Restricts concurrent drafting sessions for a specific content type via a Postgres partial unique index, dynamically treating sessions as expired on-the-fly if inactive for over 10 minutes.
  - `refreshActivity.ts`: Automatically tracks active interaction sequences to keep the session alive.
  - `capVersions.ts`: Trims history snapshots to a maximum of 10 items using a FIFO buffer.
- **[NEW] `StyleModifiers` Collection** ([StyleModifiers](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/StyleModifiers/index.ts)): Tenant-scoped brand tone descriptions (Academic, Punchy, Technical) injected dynamically into generation prompts.
- **[NEW] `AIAuditLogs` Collection** ([AIAuditLogs](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/AIAuditLogs/index.ts)): Auditing ledger capturing model usage, prompt tokens, completion tokens, parameters, and dynamic server-side cost calculation recorded in microdollars ($1 = 1,000,000 microdollars).
- **[NEW] `AIRateLimits` Collection** ([AIRateLimits](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/AIRateLimits/index.ts)): Globally user-scoped database table that tracks requests in a rolling 60-second sliding window, bypassing tenant isolation layers using `overrideAccess: true` to prevent platform credits abuse.
- **[MODIFY] `Tenants` Collection** ([Tenants](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/Tenants/index.ts)): Added select fields `defaultLLMModel` and `defaultImageModel` to enable workspace-wide model defaults.

#### 2. Services, APIs & Proxy Routes
- **[NEW] Next.js Proxy Routes (`apps/content-management-engine/src/app/api/`)**:
  - `/api/ai/draft`: Relay proxy that streams SSE generation events, injects default models, and compiles consolidated `AIAuditLogs` entries.
  - `/api/ai/refine`: Stateless selection-based adjustments.
  - `/api/ai/refine-all`: Batch orchestrator executing parallel section refinements under a single aggregated rate-limit token and compiled audit record.
  - `/api/ai/download-image`: Pipes DALL-E generated images from Web Streams directly into Payload's native Media collection, bypassing local container memory bloat.
  - `/api/ai-drafting/sessions/[id]/rollback`: Dedicated endpoint executing server-side version rollback without roundtrip schema conversion.
  - `/api/ai-drafting/sessions/cleanup`: Secure system cron endpoint cleaning up inactive locks (>10 mins) and rate limits (>5 mins).
- **[NEW] FastAPI AI Content Bounded Context (`apps/content-authoring-service/src/`)**:
  - **`DraftingService`** ([drafting_service.py](file:///home/itlight/dev/hermes-cms/apps/content-authoring-service/src/application/drafting_service.py)): Manages multi-turn, locale-scoped conversational drafting using LangChain SDK.
  - **`RefineService`** ([refine_service.py](file:///home/itlight/dev/hermes-cms/apps/content-authoring-service/src/application/refine_service.py)): Handles text refinements with dynamic length adjustments (-30% for simplify, +30% for expand).
  - **`image_generator` Tool** ([image_generator.py](file:///home/itlight/dev/hermes-cms/apps/content-authoring-service/src/infrastructure/tools/image_generator.py)): Dynamic DALL-E integration bound as a LangChain tool.
  - **`schema_resolver` Tool** ([schema_resolver.py](file:///home/itlight/dev/hermes-cms/apps/content-authoring-service/src/infrastructure/tools/schema_resolver.py)): Looks up active collection structures on the fly.
  - **`prompts.py`** ([prompts.py](file:///home/itlight/dev/hermes-cms/apps/content-authoring-service/src/domain/content_drafting/prompts.py)): Integrates dynamic prompt management from Langfuse with static, offline-safe fallback templates.
- **[NEW] Markdown-to-Lexical Headless Service** ([markdown-to-lexical.ts](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/services/markdown-to-lexical.ts)): Translates raw Markdown stream outputs into strict block-based Lexical JSON server-side on stream completion.

#### 3. Alexandria Bespoke Drafting Workspace UI
- **`DraftingWorkspace.tsx`** ([DraftingWorkspace.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/views/DraftingWorkspace.tsx)): Editorial-grade split-view workspace featuring side navigation, top actions, version rollbacks, and active stream controls.
- **`ChatPanel.tsx`** ([ChatPanel.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/Editor/ChatPanel.tsx)): Conversational thread bar with LLM model selection and brand style modifier chips.
- **`EditorPanel.tsx`** ([EditorPanel.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/Editor/EditorPanel.tsx)): Dynamic structured editor that renders fields based on schemas, displays typing cursors during stream execution, and supports auto-saving.
- **`FloatingAIBar.tsx`** ([FloatingAIBar.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/Editor/FloatingAIBar.tsx)): Dark glassmorphic selection toolbar for in-context revisions.
- **`RecoveryDialog.tsx`** ([RecoveryDialog.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/Editor/RecoveryDialog.tsx)): Recovery modal overlay allowing users to easily resume recovered drafts within 24 hours.

---

## [0.3.0] - 2026-05-17
### Define Content Types Feature Track (`003-define-content-types`)

This feature track implements AI-assisted and visual schema modeling for Hermes AI Content Types. It allows Content Architects to describe schemas in natural language, proxies requests via Next.js monolith endpoints, processes them using LangChain 1.2+ in the FastAPI AI Microservice with a corrective self-healing retry loop, stores draft schemas, protects published schemas against destructive edits, implements optimistic concurrency control, and supports static exports to Payload 3.x-compliant TypeScript definitions.

> [!NOTE]
> All changes are fully covered by a Test-Driven Development (TDD) cycle with **40/40 passing unit and integration tests** under Jest and pytest, verifying schema validation, concurrency limits, and corrective loop generation.

---

### Added

#### 1. Core Data Models & Schema Extensions (`apps/content-management-engine/src/collections/`)
- **[NEW] `AIPromptHistory` Collection** ([AIPromptHistory](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/AIPromptHistory/index.ts)): Logs natural language prompts used and the corresponding generation outcomes.
- **[MODIFY] `ContentTypes` Collection** ([ContentTypes](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/ContentTypes/index.ts)): Extended to support:
  - `status`: Lifecycle mapping (`draft`, `published`) allowing draft schema refinement.
  - `originalSchema`: JSON field capturing the initial AI suggestions.
  - `schema`: JSON field capturing the active model configuration.
  - `generatedByAI` and `aiSessionId`: Tracing flags linking back to the Python service session.
- **[MODIFY] `ContentItems` Collection** ([ContentItems](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/ContentItems/index.ts)): Enhanced to run a dynamic `beforeValidate` hook that retrieves the related Content Type schema and enforces required, type, select options, and tenant-scoped uniqueness validations.

#### 2. Services, APIs & Validation Endpoints (`apps/content-management-engine/src/` & `apps/ai-agent-service/src/`)
- **[NEW] AI Integration Custom Endpoints (`endpoints.ts`)** ([endpoints.ts](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/ContentTypes/endpoints.ts)):
  - `POST /api/content-types/generate-schema`: Proxies user prompts using `X-Internal-Secret` to the AI microservice.
  - `GET /api/content-types/sessions/:id`: Polling proxy endpoint for schema generation state.
  - `GET /api/content-types/:id/export`: Exports the dynamic schema as clean JSON.
  - `GET /api/content-types/:id/export/ts`: Generates a static Payload 3.x CollectionConfig TypeScript file.
- **[NEW] Dynamic Content Validator (`validation.ts`)** ([validation.ts](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/ContentItems/validation.ts)): Parses dynamic JSON schemas and runs data type check filters scoped to the tenant context.
- **[NEW] Dynamic TS Generator (`export-service.ts`)** ([export-service.ts](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/services/export-service.ts)): Generates static code configurations from custom schemas.
- **[NEW] FastAPI AI Session & Validation Services (`apps/ai-agent-service/src/`)**:
  - **`AIService`** ([ai_service.py](file:///home/itlight/dev/hermes-cms/apps/ai-agent-service/src/application/ai_service.py)): Implements LangChain `init_chat_model` integration and recursive correction loops (up to 3 retries) on invalid fields.
  - **`SchemaValidator`** ([schema_validator.py](file:///home/itlight/dev/hermes-cms/apps/ai-agent-service/src/domain/schema_validator.py)): Enforces alphanumeric field slugs and verifies allowed types (`text`, `number`, `boolean`, `date`, `richText`, `json`, `relationship`, `select`, `upload`).
  - **`SQLSessionRepository`** ([session_repository.py](file:///home/itlight/dev/hermes-cms/apps/ai-agent-service/src/infrastructure/repositories/session_repository.py)): SQLAlchemy implementation for CRUD tracking of AI sessions in `hermes_ai` database.

#### 3. Alexandria Content Architect Admin views (`apps/content-management-engine/src/components/`)
- **[NEW] Content Type Generator Panel (`GeneratorView.tsx`)** ([GeneratorView.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/views/ContentTypes/GeneratorView.tsx)): Branded prompt workspace where Content Architects enter descriptions and watch real-time generation previews.
- **[NEW] Content Type Editor Refinement (`EditorView.tsx`)** ([EditorView.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/views/ContentTypes/EditorView.tsx)): High-end editor utilizing glassmorphism panels, customized fields, relationships, and download triggers for static code files.

---

### Technical Guardrails & Security Enforcement

| Principle / Area | Technical Enforcer | Constitutional Rule |
| :--- | :--- | :--- |
| **Optimistic Concurrency** | Hook verifying incoming `if-unmodified-since` header matches db `updatedAt` | Spec-003: Drafting Safety |
| **Destructive Modification Lock** | Hook rejecting deleting fields or adding required fields without defaults once entries exist | Spec-003: Operational Stability |
| **Recursive AI Correction** | App service self-correcting retry loop (max 3) feeding error details back to LLM | Principle VII: Self-Healing Architecture |

---

## [0.2.0] - 2026-05-17
### Multi-Tenant Management Feature Track (`002-tenant-management`)

This feature track implements the core multi-tenancy management foundation for Hermes AI. It provides Super Admins with the capabilities to create logically isolated tenant workspaces, map multiple branded domains with tier-based limit enforcement, manage operational lifecycles, and render a high-end bespoke CMS admin interface matching the **Alexandria — High-End Editorial** design guidelines.

> [!NOTE]
> All changes are fully covered by a Test-Driven Development (TDD) cycle with **64/64 passing integration and unit tests** verifying logical isolation, schema validations, and resolution performance.

---

### Added

#### 1. Core Data Models & Schema Extensions (`apps/content-management-engine/src/collections/`)
- **[NEW] `AuditLogs` Collection** ([AuditLogs](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/AuditLogs/index.ts)): Added a centralized collection to track platform-wide administrative actions, domain resolution failures, and tenant impersonation logs.
- **[MODIFY] `Tenants` Collection** ([Tenants](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/Tenants/index.ts)): Extended schemas with crucial fields:
  - `status`: Lifecycle mapping (`active`, `suspended`, `archived`) supporting custom soft-delete logic.
  - `tier`: Service tiers (`standard`, `premium`, `enterprise`).
  - `defaultLocale`: Locale preferences (`en`, `es`, `fr`, `de`).
  - `domains`: Sub-collection array mapping hostnames with global uniqueness and tier-based limits (Standard: 10, Premium: 50, Enterprise: Unlimited).
  - `branding`: Customized workspace assets (relationships to `media` for logo, hex value regex validations for `primaryColor`).

#### 2. Services & API Resolution Endpoints (`apps/content-management-engine/src/services/` & `apps/content-management-engine/src/app/`)
- **[NEW] Tenant Service (`tenant-service.ts`)** ([tenant-service.ts](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/services/tenant-service.ts)):
  - Optimized domain resolution service utilizing in-memory cache to guarantee `< 50ms` resolution times (SC-005).
  - Implemented slug-fallback lookup and status-based access gating to gracefully block access to suspended/archived workspaces.
  - Built high-safety Super Admin impersonation engine leveraging Payload's `overrideAccess`.
- **[NEW] Resolution API Route** ([route.ts](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/app/(payload)/api/tenants/resolve/route.ts)):
  - Built endpoint `GET /api/tenants/resolve?hostname=...` for fast external gateway mapping.
  - Integrated `X-Internal-Secret` header authentication for CMS-to-AI microservice communications.

#### 3. Alexandria Bespoke Admin UI & Shared Registry Components (`apps/content-management-engine/src/components/`)
- **[MODIFY] Reusable Atomic `Badge` Component** ([Badge.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/ui/atoms/Badge.tsx)): Evolved the atomic `Badge` to be a highly versatile, generic component supporting custom sizing (`sm`, `md`), visual variants (`solid`, `subtle`, `outline`), curated semantic color states (`primary`, `tertiary`, `success`, `danger`, `warning`, `neutral`, `gold`), and embedded Google Material icons.
- **[NEW] Reusable Shared UI Components (`apps/content-management-engine/src/components/ui/`)**:
  - **`RegistryHeader`** ([RegistryHeader.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/ui/molecules/RegistryHeader.tsx)): An editorial-grade view header featuring Outfit/Public Sans typography and staggered soft-blur word entry animations.
  - **`RegistryTable`** ([RegistryTable.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/ui/organisms/RegistryTable.tsx)): A borderless grid-card hybrid registry container with decorative monogram avatars, flex column layouts, and high-fidelity pulse skeleton loading state.
  - **`FilterChips`** ([FilterChips.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/ui/molecules/FilterChips.tsx)): Generically typed visual status filtering controls utilizing premium color accents.
  - **`SearchInput`** ([SearchInput.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/ui/molecules/SearchInput.tsx)): A beautiful search text field with subtle debouncing to limit load refetches.
  - **`RegistryPagination`** ([RegistryPagination.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/ui/molecules/RegistryPagination.tsx)): High-end page controls for navigating multi-page listings.
  - **`ConfirmationModal`** ([ConfirmationModal.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/ui/organisms/ConfirmationModal.tsx)): A general-purpose glassmorphism dialog for danger-level double confirmation prompts (e.g. decommissioning).
- **[NEW] Custom User Registry View (`UserListPage.tsx`)** ([UserListPage.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/views/UserListPage.tsx)):
  - Built a customized identity admin interface displaying registered accounts with modern monogram avatars.
  - Refactored user role and tenant scoping chips to utilize the evolved atomic `Badge` component, aligning them perfectly with Alexandria design tokens.
  - Integrated full role filter chips, live search inputs, and deletion workflows protected by self-deletion safeguards.
- **[MODIFY] Tenant List View (`TenantListPage.tsx`)** ([TenantListPage.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/views/TenantListPage.tsx)):
  - Completely refactored to utilize the newly created shared visual registry components, eliminating over 250 lines of duplicate UI layout structure.
  - Migrated service tier and status indicators to use the evolved generic atomic `Badge` component, ensuring typography and roundness consistency.
- **[MODIFY] Users Collection Configuration (`index.ts`)** ([Users/index.ts](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/collections/Users/index.ts)):
  - Registered `UserListPage` custom React component inside `admin.components.views.list` to substitute default list grids.
- **[MODIFY] Global Stylesheet (`globals.css`)** ([globals.css](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/app/globals.css)):
  - Added modern Alexandria text stagger animations utilizing keyframe-based soft-blur blur scales (`.animate-soft-blur-in`).
- **[MODIFY] Tenant Creation/Edit Wizard (`CreateTenantPage.tsx`)** ([CreateTenantPage.tsx](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/components/views/CreateTenantPage.tsx)):
  - Integrated interactive step navigation (Identity -> Domains -> White-Labeling).
  - Added live domain-limit meters, real-time slug format validation, and high-fidelity, real-time branded sidebar preview cards.
- **[MODIFY] Global Custom Layout Reset (`globals.css`)** ([globals.css](file:///home/itlight/dev/hermes-cms/apps/content-management-engine/src/app/globals.css)):
  - Registered `.custom-tenant-view` and `.custom-user-view` layout reset styles using modern CSS `:has()` relational selectors. Hides redundant Payload CMS headers, gutters, title cards, and navigation controls cleanly, ensuring our bespoke Alexandria editorial dashboards render perfectly with the proper `18rem` sidebar offset.

---

### Technical Guardrails & Security Enforcement

| Principle / Area | Technical Enforcer | Constitutional Rule |
| :--- | :--- | :--- |
| **Logical Multi-tenancy** | Payload ACLs restricting reading/writing to `tenant` relationship matches | Principle I: Multi-tenancy by Default |
| **Header Authentication** | Verification of matching `X-Internal-Secret` in all resolution requests | Principle VII: Monolith-to-Service Security |
| **Operational Gating** | Active checks blocking resolving requests for `suspended` and `archived` tenants | Spec-002: Operational Lifecycles |
| **Visual Elegance** | Glassmorphism surfaces, custom `#094cb2` gradients, Outfit/Public Sans badges | DESIGN.md: Alexandria High-End Editorial |

---

### Test-Driven Development (TDD) Highlights
- **100% Pass Rate**: Verified 64 unit, integration, and contract tests in `apps/content-management-engine` under Jest:
  - `schema.test.ts`: Checked strict alphanumeric validation, lowercase slug restrictions, and domain format checks.
  - `access.test.ts`: Confirmed non-admin users cannot mutationally access system tenant details.
  - `tenant-resolution.test.ts`: Verified hostname resolution, slug fallback, and internal secret verification.
  - `test_tenant_soft_delete.ts`: Checked that "decommissioned" tenants are marked `archived` rather than physically deleted.
  - `audit-logging.test.ts`: Checked that all resolution failures and impersonation sessions write structured metadata to `AuditLogs`.
