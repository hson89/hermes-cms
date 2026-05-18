# Feature Specification: AI Content Drafting

**Feature Branch**: `004-ai-content-drafting`  
**Created**: 2026-05-18  
**Status**: Draft  
**Input**: User description: "Content Drafting with AI based on mockup"

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

- **Schema Mismatch**: What happens when the user asks to draft using a schema that doesn't exist? (System should suggest existing schemas or ask for clarification).
- **Network Interruptions**: How does the system handle a lost connection during a long "Drafting..." state? (System should persist partial content and allow resuming).
- **Tenant Isolation**: How does the AI ensure it only uses knowledge and schemas from the current tenant? (Strict tenant-scoping for all RAG and prompt context).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a split-view interface with an AI Chat panel on the left and a Structured Editor on the right.
- **FR-002**: System MUST automatically identify the target Content Type (schema) from natural language user prompts.
- **FR-003**: System MUST support real-time population of structured fields (Title, Slug, Author, Media, Body) via AI streaming.
- **FR-004**: System MUST provide a global "Pause" control to halt active AI generation streams.
- **FR-005**: System MUST provide an "AI SUGGESTS" indicator and per-field actions (Edit, Accept, Refresh) for every AI-populated field.
- **FR-006**: System MUST feature a "Style & Tone" selector (e.g., Academic, Punchy, Technical, Marketing, Casual) that modifies the system prompt for all subsequent AI generations.
- **FR-007**: System MUST provide a floating AI action bar for the rich-text editor with "Simplify", "Expand", and "Change Tone" capabilities, alongside a section-level "REFINE ALL" action.
- **FR-008**: System MUST support AI-driven image generation for "Main Media" fields based on content context.
- **FR-009**: System MUST support tracking "Versions" of the draft to allow users to navigate through iteration history.

### Key Entities *(include if feature involves data)*

- **DraftingSession**: Represents the active state of an AI drafting interaction, linking a Tenant, User, and Schema.
- **AISuggestion**: Stores individual field suggestions, allowing for "refresh" and "undo" actions.
- **StyleModifier**: A configuration entity defining the prompt injections for different tones (Technical, Punchy, etc.).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a complete 500-word structured draft in under 45 seconds.
- **SC-002**: 70% of AI-generated titles are accepted by the user without manual modification.
- **SC-003**: The floating AI bar reduces the time spent on paragraph editing by 30%.
- **SC-004**: All AI interactions must respect tenant boundaries, with 0% cross-tenant data leakage.

## Assumptions

- **Existing AI Service**: Relies on the `content-authoring-service` (FastAPI/LangChain) being functional and accessible.
- **Schema Availability**: Assumes that at least one Content Type is defined for the tenant before drafting begins.
- **Asset Storage**: Assumes the CMS has a configured media provider for storing AI-generated images.
- **Auth**: CMS ↔ AI auth via `X-Internal-Secret` as per project rules.
