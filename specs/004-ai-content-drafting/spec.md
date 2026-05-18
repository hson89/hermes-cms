# Feature Specification: AI Content Drafting

**Feature Branch**: `004-ai-content-drafting`  
**Created**: 2026-05-18  
**Status**: Draft  
**Input**: User description: "Content Drafting with AI based on mockup"

## Clarifications

### Session 2026-05-18

- Q: How should the system handle the transition from an AI drafting workspace to a persisted CMS entry? → A: Drafts exist only in a temporary `DraftingSession` state until the user clicks "Save" or "Publish".
- Q: What are the acceptable latency targets for granular, field-level AI refinements? → A: Granular refinements (e.g., Title generation, paragraph simplification) must return the first token within 2 seconds.
- Q: How should the system handle concurrent AI drafting sessions? → A: Single-User Lock: Only one user can have an active drafting session for a specific schema at a time.
- Q: In which database and service layer should the temporary `DraftingSession` and its state be persisted? → A: Persistent Payload CMS Collection in the Content Management Engine (Postgres 5432) utilizing logical tenant-scoped ACLs.
- Q: What should be the concrete timeout duration for releasing the single-user lock on an inactive `DraftingSession`? → A: 10 minutes of inactivity.
- Q: How should progress in a `DraftingSession` be auto-saved to support recovery from network interruptions? → A: Immediate field-level auto-saving: Persist field updates to the `DraftingSession` collection immediately as each field completes generation or is edited.
- Q: How should AI-driven image generation for the `Main Media` field (`FR-008`) be orchestrated and integrated? → A: LangChain Tool Orchestration: Delegated to LangChain image generation tools configured within the `content-authoring-service`, triggered via agent tool calls.
- Q: How should we handle the relationship between schema creation and content drafting in a session? → A: Unified Inline Co-Creation: The conversational agent in `content-authoring-service` can dynamically create/modify Content Type schemas inline via tool calls and immediately draft content inside the same workspace, maintaining a seamless user experience.
- Q: How should the draft version tracking (FR-009) be persisted and capped to prevent bloating the database? → A: Snapshot-based collection: Saved as an array of snapshot states inside the DraftingSession, capped at the last 10 versions.
- Q: What functional features should be explicitly declared out of scope for this initial AI Content Drafting MVP? → A: Real-time multi-user concurrent editing (Google Docs style) and side-by-side multi-model comparison workspaces are out of scope.
- Q: Which streaming protocol should be used to deliver real-time AI suggestions from the Content Authoring Service to the Content Management Engine, and ultimately to the frontend editor? → A: Server-Sent Events (SSE) standard HTTP unidirectional streaming.
- Q: How should the system store and reference AI-generated images for the 'Main Media' field (FR-008)? → A: Proactive CMS Download: The CMS Engine downloads the generated image and persists it to the Payload Media collection, returning a permanent local CMS media reference.
- Q: How should the system monitor, log, and attribute AI token usage and costs for multi-tenant isolation and billing purposes? → A: Active Logging & Attribution: Log all AI requests to a dedicated, tenant-scoped `AIAuditLog` collection in the CMS Engine, capturing tenant ID, user ID, prompt/response metadata, and tokens consumed.
- Q: Which User roles within a tenant should be authorized to initiate an AI Content Drafting session, generate content, and perform refinements? → A: All authenticated tenant users (e.g., `admin`, `editor`) who possess content creation/edit permissions are authorized.
- Q: What rate-limiting or budget-control mechanism should be implemented in the application layer to prevent a single user or tenant from consuming excessive AI API credits and costs? → A: Request-Rate Limiting: Enforce a maximum of 10 AI request/refinement attempts per minute per user, throwing a HTTP 429 when exceeded.
- Q: What should be the persistence lifecycle of inactive or expired `DraftingSession` entries? When a session is locked out or times out after 10 minutes of inactivity, does the system immediately delete the draft data, or do we retain it for recovery? → A: 24-Hour Recovery Window: Retain the session in an `expired` state for 24 hours to allow recovery, after which a background cleanup job permanently purges it.
- Q: When a user opens the drafting interface for a schema that has an expired (inactive) but recoverable `DraftingSession` (within the 24-hour retention window), how should the UI handle the recovery flow? → A: Recovery Prompt Dialog: Block the view with a premium dialog: "An unsaved draft was found from [timestamp]. Would you like to resume drafting or start fresh?".
- Q: How should the system determine and switch between different LLM models/providers (e.g., OpenAI, Anthropic, Gemini) for a drafting session? → A: Tenant Default + User Override: Admin sets a tenant-wide default model, which the editor can optionally override via the drafting sidebar settings using LangChain's dynamic model routing.
- Q: How should the Content Authoring Service format and serialize the streamed content for the 'Body' field (FR-003, FR-008), given that Payload CMS 3.x utilizes a strict, block-based JSON Lexical editor? → A: Markdown-to-Lexical Conversion: The Content Authoring Service streams standard, clean Markdown, and the CMS Engine **server-side API route** converts the Markdown into Payload's Lexical JSON format using `@payloadcms/richtext-lexical`'s headless editor before persisting to the DraftingSession. The streaming UI renders raw Markdown in a preview component; the final Lexical JSON is produced only on save/auto-save. *(Amended 2026-05-18: Changed from "client-side" to "server-side API route" per R-001 architectural decision — client-side conversion is impractical because it requires shipping the full Lexical editor config and custom server-only node types to the browser.)*
- Q: What should be the lifecycle of the temporary `DraftingSession` and its version snapshots once the user explicitly clicks "Save" or "Publish" and successfully promotes the draft into a persistent `ContentItem` in the CMS? → A: Atomic Promotion & Purge: The `DraftingSession` and all its 10 associated version snapshots are immediately and permanently deleted upon successful creation/update of the `ContentItem`.
- Q: When a user explicitly closes the drafting workspace or navigates away (e.g., clicks a "Cancel/Back" button, closes the tab, or goes to another admin route), how should the single-user session lock be managed? → A: Proactive Release with Timeout Fallback: The CMS Engine UI makes a proactive API request to release the single-user lock immediately on explicit navigation/exit or browser tab closure, falling back to the 10-minute inactivity timeout only on network cutoffs.
- Q: How should the AI Content Drafting session co-create content for schemas that contain localized fields (e.g., fields marked `localized: true`) when the tenant has multiple active locales? → A: Active Editor Locale Focus: The drafting session is scoped strictly to the current active locale selected in the editor UI. The AI drafts and refines in that language. Editors handle other locales by switching the editor locale and requesting translation/refinement.
- Q: When a user highlights text in the rich-text editor and triggers a refinement (e.g., "Simplify" or "Expand" from the floating AI bar), how should this interaction be orchestrated and recorded relative to the `DraftingSession`? → A: Stateless Inline Refinement with UI Auto-Save: The floating bar calls a stateless refinement endpoint (similar to `CopilotService`). The revised text is replaced directly in the client-side editor, which then auto-saves the updated field value to the `DraftingSession` collection.
- Q: How should the visual/conversational "Style & Tone" modifiers (`StyleModifier`) be persisted and managed in the multi-tenant system? → A: Tenant-Scoped Collection: Persisted in a tenant-scoped Payload CMS collection, allowing tenant admins to define, edit, and delete custom tone prompts.
- Q: When an active SSE content generation stream is interrupted due to a network cutoff, how should the system handle the recovery of the streamed field? → A: Keep Partial Draft & Prompt to Regenerate: Keep the partially streamed text in the editor and `DraftingSession`, and display an inline warning with a manual "Regenerate" button.


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema-Based AI Drafting (Priority: P1)

As a content author, I want to ask Alexandria AI to draft an entry based on a specific content type so that I can quickly generate a structured starting point for my content.

**Why this priority**: This is the core value proposition of the "AI-First" CMS, allowing rapid content creation.

**Independent Test**: Can be tested by initiating a chat, requesting a draft for a known schema, and verifying that the fields on the right-hand editor populate correctly.

**Acceptance Scenarios**:

1. **Given** the Command Center is open, **When** the user asks to "Draft an article about the future of AI in 2025 using our Tech Blog schema", **Then** the AI identifies the 'Technology Blog Post' schema and populates the Title, Slug, and Body fields.
2. **Given** an active drafting session, **When** the AI generates content, **Then** an "AI SUGGESTS" indicator appears next to the populated fields.

---

### User Story 2 - Iterative Field Refinement (Priority: P2)

As a content author, I want to refine specific fields using AI suggestions or floating action bars so that I can tune the content to my specific needs without manual rewriting.

**Why this priority**: Enhances the collaboration between user and AI, providing granular control over the generated content.

**Independent Test**: Can be tested by highlighting text in the body or clicking "AI SUGGESTS" on a field and verifying the content changes based on the request.

**Acceptance Scenarios**:

1. **Given** a populated Body field, **When** the user highlights a paragraph and selects "Simplify" from the floating AI bar, **Then** the paragraph is replaced with a more concise version.
2. **Given** a field with an "AI SUGGESTS" indicator, **When** the user clicks "Refresh", **Then** the AI generates an alternative suggestion for that specific field.

---

### User Story 3 - Global Style & Tone Application (Priority: P3)

As a content author, I want to set a global style and tone modifier so that all AI-generated suggestions align with my brand's voice.

**Why this priority**: Ensures consistency across multiple content entries and reduces the need for manual tone adjustment.

**Independent Test**: Can be tested by switching between "Technical" and "Punchy" tones and verifying that new generations reflect the chosen style.

**Acceptance Scenarios**:

1. **Given** the "Technical" tone is selected, **When** the AI drafts content, **Then** the language used is precise, data-driven, and structured.
2. **Given** the "Casual" tone is selected, **When** the user requests a refinement, **Then** the AI uses a conversational and approachable voice.

---

### Edge Cases

- **Schema Mismatch**: What happens when the user asks to draft using a schema that doesn't exist? (System dynamically triggers schema creation inline via the `create_schema` tool in the same session, updates the Structured Editor view, and immediately proceeds to draft the content).
- **Network Interruptions**: How does the system handle a lost connection during a long "Drafting..." state? (System retains the partially streamed field value in the `DraftingSession` collection and displays a "Stream Interrupted" warning alert with a manual "Regenerate" button, allowing the user to either continue editing the partial content or regenerate the field from scratch).
- **Tenant Isolation**: How does the AI ensure it only uses knowledge and schemas from the current tenant? (Strict tenant-scoping for all RAG and prompt context).
- **Concurrent Session Attempt**: When a user attempts to start a drafting session for a schema already being drafted by another user, the system MUST show a "Session in progress" message and prevent entry.
- **Stale Session**: Drafting sessions MUST have a timeout (10 minutes of inactivity) to release the single-user lock if the user leaves without saving. The system proactively releases this lock immediately upon explicit user exit or tab closure, with the 10-minute inactivity timeout serving as a safety fallback. The expired session and its snapshot data are retained in an 'expired' state for 24 hours to allow recovery, after which a background cleanup job permanently purges them.
- **Recovering Expired Session**: When a user returns to a schema with an expired but recoverable drafting session (within the 24-hour retention window), the system MUST display a confirmation dialog prompting them to either resume the recovered draft or start fresh. Starting fresh will immediately delete the recovered draft.
- **Rate Limiting / Cost Control**: If a user exceeds 10 AI request/refinement attempts in a rolling 60-second window, the system MUST return a `429 Too Many Requests` error and prompt the user to wait before requesting more suggestions.

## Requirements *(mandatory)*

### Out of Scope

- **Real-Time Collaboration**: Multi-user concurrent editing (Google Docs style) is out of scope. Concurrent access is handled via the single-user session lock (FR-011).
- **Multi-Model Comparison**: A side-by-side comparison workspace of different LLM model generations is out of scope.

### Functional Requirements

- **FR-001**: System MUST provide a split-view interface with an AI Chat panel on the left and a Structured Editor on the right.
- **FR-002**: System MUST automatically identify the target Content Type (schema) from natural language prompts, or dynamically create/modify it inline via the shared `content-authoring-service` toolset if the schema does not exist.
- **FR-003**: System MUST support real-time population of structured fields (Title, Slug, Author, Media, Body) via Server-Sent Events (SSE) standard HTTP unidirectional streaming. The rich-text `Body` field MUST stream as standard Markdown and be converted to Payload Lexical JSON in the CMS Engine **server-side API route** (using `@payloadcms/richtext-lexical`'s headless editor). *(Amended 2026-05-18: Changed from "client-side" to "server-side API route" per R-001 — see Clarifications.)* If the stream is interrupted, the system MUST retain the partially streamed content in the `DraftingSession` and display an inline warning with a manual "Regenerate" option.
- **FR-004**: System MUST provide a global "Pause" control to halt active AI generation streams.
- **FR-005**: System MUST provide an "AI SUGGESTS" indicator and per-field actions (Edit, Accept, Refresh) for every AI-populated field.
- **FR-006**: System MUST feature a "Style & Tone" selector that loads options from the tenant-scoped `StyleModifier` collection, allowing brand tone prompts to be dynamically injected into subsequent AI generation requests.
- **FR-007**: System MUST provide a floating AI action bar for the rich-text editor with "Simplify", "Expand", and "Change Tone" capabilities, alongside a section-level "REFINE ALL" action. These inline refinements MUST be stateless calls that replace highlighted text directly in the client-side editor, which then triggers a standard field-level auto-save to the `DraftingSession` database.
- **FR-008**: System MUST support AI-driven image generation for "Main Media" fields based on content context, orchestrated via LangChain tool calling in the `content-authoring-service`, with the Content Management Engine proactively downloading and persisting the generated image directly to the Payload `Media` collection to obtain a permanent local reference.
- **FR-009**: System MUST support tracking "Versions" of the draft to allow users to navigate through iteration history, implemented as an array of up to 10 snapshot states inside the `DraftingSession` for rollback support.
- **FR-010**: System MUST maintain drafts exclusively within the temporary `DraftingSession` state; they are NOT persisted to formal `ContentItems` until the user explicitly clicks "Save" or "Publish". Upon successful creation or update of the `ContentItem`, the temporary `DraftingSession` and all its snapshots MUST be atomically and permanently deleted.
- **FR-011**: System MUST enforce a single-user lock per schema/drafting session; other users attempting to start a session for the same schema MUST receive a "Session in progress" notification. The system MUST proactively release the lock immediately upon explicit user exit or page unload, with a 10-minute inactivity timeout serving as a safety fallback.
- **FR-012**: System MUST log every AI request and model response to a tenant-scoped `AIAuditLog` collection in the CMS Engine, including token counts, costs, and user/session identifiers for auditing and usage attribution.
- **FR-013**: System MUST authorize all authenticated tenant users (e.g., `admin`, `editor` roles) who possess content creation/edit permissions to access and utilize AI Content Drafting sessions.
- **FR-014**: System MUST enforce a request rate limit of 10 AI requests/refinements per minute per user, returning an HTTP 429 status code upon violation.
- **FR-015**: System MUST retain inactive/expired `DraftingSession` entries in an 'expired' status for a 24-hour recovery window to allow recovery before they are permanently purged via a background cleanup process.
- **FR-016**: System MUST present a confirmation dialog upon entering a schema drafting workspace with a recoverable session, allowing the user to either resume drafting from the recovered state or discard it and start fresh.
- **FR-017**: System MUST support a tenant-configured default LLM model/provider, and allow editors to optionally override the selected model inside the drafting session sidebar using LangChain's dynamic model routing.
- **FR-018**: System MUST scope the co-creation session strictly to the user's active editor locale selected in the UI. All AI content generation, refinement, and streaming MUST match this active locale. Other locales MUST be edited or translated by explicitly switching the editor locale.

### Key Entities *(include if feature involves data)*

- **DraftingSession**: A Payload CMS collection representing the active state of an AI drafting interaction, linking a Tenant, User, and Schema, containing up to 10 snapshot versions for draft recovery/rollback (storing rich-text fields as Payload Lexical JSON resolved from AI-generated Markdown).
- **AISuggestion**: Stores individual field suggestions, allowing for "refresh" and "undo" actions.
- **StyleModifier**: A tenant-scoped Payload CMS collection defining custom brand tone prompts (e.g., Academic, Punchy, Technical) and their corresponding system prompt instructions.
- **AIAuditLog**: A tenant-scoped Payload CMS collection documenting every AI request, model parameter, token count, cost, and user/session context for compliance and billing purposes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a complete 500-word structured draft in under 45 seconds.
- **SC-002**: 70% of AI-generated titles are accepted by the user without manual modification.
- **SC-003**: The floating AI bar reduces the time spent on paragraph editing by 30%.
- **SC-004**: All AI interactions must respect tenant boundaries, with 0% cross-tenant data leakage.
- **SC-005**: Granular field-level AI refinements (e.g., "Simplify") MUST return the first token (Time-to-First-Token) in under 2 seconds.

## Assumptions

- **Existing AI Service**: Relies on the `content-authoring-service` (FastAPI/LangChain) being functional and accessible.
- **Schema Availability**: Assumes that at least one Content Type is defined for the tenant before drafting begins.
- **Asset Storage**: Assumes the CMS has a configured media provider for storing AI-generated images returned by the `content-authoring-service`.
- **Auth**: CMS ↔ AI auth via `X-Internal-Secret` as per project rules.
