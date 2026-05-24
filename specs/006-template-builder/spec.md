# Feature Specification: Template Builder Engine

**Feature Branch**: `006-template-builder`  
**Created**: 2026-05-24  
**Status**: Draft  
**Input**: User description: "I want to create the feature where I can use Hermes CMS to create a new template such as landing page, I can pick different build blocks to construct the page and then accociate them with the content type schema too. After that, I can publish and deploy this new template to the frontend apps"

## Clarifications

### Session 2026-05-24
- Q: How does the CMS identify which visual components are available? → A: Code-First Discovery (Blocks are defined in the frontend apps and synced/registered with the CMS).
- Q: What is the delivery mechanism for template deployment? → A: Webhook Trigger (Publishing fires a webhook to rebuild the frontend applications statically).
- Q: Can a single Page Template be used by multiple different Content Types? → A: Strict 1-to-1 Mapping (A Template is created for and bound to exactly one Content Type schema).
- Q: How much control should users have over visual styling of blocks? → A: Schema-Driven Styling (All visual variations are controlled via mapped schema fields).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visual Template Assembly (Priority: P1)

As a Content Architect, I want to visually assemble a page template by selecting and arranging predefined building blocks so that I can define the structure of a landing page without writing code.

**Why this priority**: This is the core "Builder" functionality. Without the ability to pick and arrange blocks, the feature doesn't exist.

**Independent Test**: Can be fully tested by creating a new template, adding three different blocks, reordering them, and saving the template configuration.

**Acceptance Scenarios**:

1. **Given** I am in the Template Builder, **When** I click "Add Block", **Then** I see a list of available visual components (e.g., Hero, Gallery, CTA).
2. **Given** a template with multiple blocks, **When** I drag a block to a new position, **Then** the visual order of the template is updated and persisted.
3. **Given** an assembled template, **When** I save it, **Then** it appears in the "Templates" list with a unique identifier.

---

### User Story 2 - Schema Association (Priority: P2)

As a Developer, I want to map the building blocks in a template to specific fields in a Content Type schema so that the template knows where to fetch its data from.

**Why this priority**: Enables the "CMS" part of the builder. Without data mapping, the templates are just static layouts.

**Independent Test**: Can be tested by creating a Content Type (e.g., "Promotion"), creating a Template, and successfully linking a "Headline" block property to a "Promo Title" field in the Content Type.

**Acceptance Scenarios**:

1. **Given** a block in a template, **When** I open its settings, **Then** I can select a compatible field from an associated Content Type schema to bind to the block's properties.
2. **Given** a template-to-schema mapping, **When** the schema changes (e.g., a field is deleted), **Then** the Template Builder highlights the broken association.

---

### User Story 3 - Deployment to Frontend (Priority: P3)

As a Content Manager, I want to "Publish" a template so that it becomes available and active on the connected frontend applications (Next.js/Astro).

**Why this priority**: Necessary for the feature to deliver value to the end-user on the live site.

**Independent Test**: Can be tested by clicking "Deploy" on a template and verifying that the frontend application receives a signal (or update) containing the new template structure.

**Acceptance Scenarios**:

1. **Given** a saved template, **When** I click "Deploy", **Then** the system triggers a synchronization event to registered frontend apps.
2. **Given** a deployed template, **When** I view the deployment status, **Then** I see a confirmation that the frontend has acknowledged the new configuration.

---

### Edge Cases

- **Block Incompatibility**: What happens when a user tries to map a "List" block to a single "String" field?
- **Missing Block Definitions**: How does the system handle a template if a previously used block type is removed from the codebase?
- **Concurrent Editing**: How does the system handle two users editing the same template layout simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Template Library" view to manage (create, edit, delete) page templates.
- **FR-002**: System MUST allow users to select from a registry of "Building Blocks" (Hero, Feature, Pricing, etc.).
- **FR-003**: System MUST allow defining "Slots" or "Areas" within a template where blocks can be dropped.
- **FR-004**: System MUST allow associating a Template with exactly one primary Content Type schema.
- **FR-005**: System MUST provide a mapping interface to link Block Properties (e.g., Image URL, Text, and Style/Theme parameters) to Schema Fields, enforcing schema-driven styling.
- **FR-006**: System MUST discover available "Building Blocks" via Code-First Discovery, where blocks are defined in the frontend apps and synced/registered with the CMS.
- **FR-007**: System MUST deploy templates via a Webhook Trigger mechanism, where publishing fires a webhook to trigger a rebuild of the registered frontend applications.
- **FR-008**: System MUST support "Alexandria" design system tokens for all builder UI elements.
- **FR-009**: System MUST validate that all required block properties are mapped to schema fields before allowing deployment.
- **FR-010**: System MUST support multi-tenant isolation; templates created in one tenant must not be visible to others.

### Key Entities *(include if feature involves data)*

- **PageTemplate**: Represents the structural definition of a page (metadata, block order, schema mapping).
- **BuildingBlock**: A reusable UI component definition (name, required properties, visual thumbnail).
- **BlockInstance**: A specific usage of a BuildingBlock within a PageTemplate, including its mapping to schema fields.
- **TemplateDeployment**: Tracks the history and status of template pushes to frontend environments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A non-technical user can assemble a 5-block landing page template in under 10 minutes.
- **SC-002**: 100% of block properties can be mapped to valid Content Type fields via the UI without manual JSON editing.
- **SC-003**: Template deployment signal reaches the frontend application within 5 seconds of the user clicking "Publish".
- **SC-004**: System supports at least 50 concurrent templates per tenant without UI performance degradation.

## Assumptions

- **Alexandria Foundation**: The Builder UI will use the existing Alexandria design system (Noto Serif, Inter, Glassmorphism).
- **Headless Delivery**: The templates themselves are delivered as structured data (JSON) describing the layout, which the frontend apps know how to render.
- **Existing Content Types**: The feature assumes that Content Types (Tenants, ContentItems) already exist or can be created via the standard CMS flow.
- **React/Astro Support**: The initial set of "Building Blocks" will be compatible with the existing Next.js and Astro site templates.
