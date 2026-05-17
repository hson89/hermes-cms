# Feature Specification: Define Content Types

**Feature Branch**: `003-define-content-types`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: User description: "Define Content Types Define the schema and structure of your headless data models with AI assistance."

## Clarifications

### Session 2026-05-17

- Q: How should the generated schemas be applied to the CMS? → A: Store as Drafts
- Q: How should the system handle AI suggestions that contain hallucinated or unsupported field types? → A: Auto-regenerate schema
- Q: Should the AI-assisted modeling support complex nested structures (e.g., Arrays of fields or Payload "Blocks")? → A: Support both flat and nested structures (Blocks/Arrays)
- Q: How should the CMS UI communicate with the AI service for schema generation? → A: Direct REST API call from CMS frontend to AI microservice
- Q: Should the AI service provide a single generic "modeling" endpoint or specific endpoints for different modeling tasks (e.g., generate-schema, suggest-validations)? → A: Specific endpoints (e.g., /generate-schema)
- Q: How should the system handle updates to published content types that already contain data? → A: Prevent destructive changes (e.g., deleting fields or changing incompatible types)
- Q: What external export formats should the system support for schemas? → A: JSON or Payload-compatible TypeScript
- Q: How should the system handle AI service failures or long-running generation tasks? → A: Log in AI microservice; UI polls/subscribes for status
- Q: How should the system handle concurrent edits to the same content type draft? → A: Last-write-wins with an overwrite warning (optimistic concurrency)
- Q: How should the AI suggest relationships between content types? → A: "Loose" suggestions (AI suggests by name; user confirms mapping to existing collections)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI-Assisted Schema Generation (Priority: P1)

As a Content Architect, I want to describe my data model in natural language so that the system can automatically suggest a structured schema with appropriate fields and validations.

**Why this priority**: This is the core unique value proposition—using AI to accelerate the tedious process of schema definition.

**Independent Test**: Can be tested by providing various domain-specific prompts (e.g., "Create a schema for a luxury car dealership inventory") and verifying that the AI returns a valid, multi-field schema.

**Acceptance Scenarios**:

1. **Given** a blank schema editor, **When** I enter a prompt "A real estate listing with price, location, and multiple images", **Then** the system generates a schema with fields for price (number), location (text/object), and images (array/gallery).
2. **Given** an AI-suggested schema, **When** I click "Apply", **Then** the schema is saved and ready for content entry.

---

### User Story 2 - Schema Refinement and Validation (Priority: P1)

As a Developer, I want to review and modify the AI-suggested fields so that I can ensure technical constraints and custom validation rules are met.

**Why this priority**: AI suggestions are rarely 100% perfect for technical implementation; human oversight is critical for system integrity.

**Independent Test**: Can be tested by manually adding, removing, or editing fields within an AI-generated schema.

**Acceptance Scenarios**:

1. **Given** an AI-suggested field "Price", **When** I add a "Minimum value: 0" validation, **Then** the system persists this rule.
2. **Given** a suggested "Location" field, **When** I change its type from "Text" to "Relationship" (pointing to a 'Cities' collection), **Then** the system updates the field definition accordingly.

---

### User Story 3 - Visual Schema Modeling (Priority: P2)

As a Content Architect, I want a visual interface to drag-and-drop or manually configure fields when I have specific requirements that don't need AI assistance.

**Why this priority**: Essential fallback for power users or very specific, non-standard models.

**Independent Test**: Can be tested by creating a content type from scratch without using the AI prompt.

**Acceptance Scenarios**:

1. **Given** the schema builder, **When** I drag a "Rich Text" field into the workspace, **Then** it is added to the content type.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a natural language interface (prompt box) for describing data models.
- **FR-002**: System MUST use AI to parse prompts and return a list of recommended fields, types, and labels.
- **FR-003**: System MUST support standard field types: Text, Number, Date, Boolean, Relationship, Upload, Select, Rich Text, and complex nested structures (Blocks and Arrays).
- **FR-004**: System MUST allow users to preview the generated schema before saving.
- **FR-005**: System MUST validate that content type names and field slugs are unique within the tenant.
- **FR-006**: System MUST allow marking fields as "Required", "Unique", or "Localized".
- **FR-007**: System MUST provide a "Diff" view or clear indication of what the AI suggested vs. manual changes.
- **FR-008**: System MUST store generated schemas as draft configurations in the database until explicitly published/deployed to Payload.
- **FR-009**: System MUST automatically reject AI suggestions containing unsupported field types and prompt the AI to regenerate the schema (with a retry limit) before showing the preview.
- **FR-010**: System MUST prevent destructive changes (e.g., field deletion, incompatible type changes) to published Content Types that contain existing content items.
- **FR-011**: System MUST provide functionality to export Content Type schemas as standard JSON or Payload-compatible TypeScript definitions.
- **FR-012**: System MUST implement optimistic concurrency control for Content Type drafts, warning users if the draft has been modified by another session since it was opened.

### Non-Functional Requirements

- **NFR-001**: AI generation tasks MUST be observable; the AI microservice MUST log progress and errors, and the CMS UI MUST poll or subscribe for status updates rather than relying on synchronous HTTP timeouts.

### Key Entities *(include if feature involves data)*

- **ContentType**: The blueprint for data. Contains Name, Slug, Description, and a collection of Fields.
- **Field**: An individual data point definition. Contains Label, Name (slug), Type, Validation Rules, and UI Settings.
- **AIPromptHistory**: Log of prompts used and schemas generated to improve future suggestions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a multi-field (5+ fields) content type schema from a single prompt in under 15 seconds.
- **SC-002**: 75% of AI-generated fields are accepted by users without changing the suggested data type.
- **SC-003**: 100% of generated schemas are technically valid and deployable to the CMS without errors.
- **SC-004**: Users report a 50% reduction in time spent on initial schema drafting compared to manual creation.

## Assumptions

- AI service has access to a registry of available field types supported by the underlying CMS (Payload).
- The system defaults to standard naming conventions (camelCase or kebab-case) for slugs if not specified in the prompt.
- High-level security/access control for content types is managed separately (out of scope for this modeling feature).
- Multi-tenancy isolation ensures one tenant's prompts/schemas don't leak to others.
t's prompts/schemas don't leak to others.
