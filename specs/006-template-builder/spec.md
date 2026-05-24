# Feature Specification: Template Builder Engine

**Feature Branch**: `006-template-builder` 
**Created**: 2026-05-24 
**Status**: Ready for Implementation 
**Input**: User description: "I want to create the feature where I can use Hermes CMS to create a new template such as landing page, I can pick different build blocks to construct the page and then accociate them with the content type schema too. After that, I can publish and deploy this new template to the frontend apps"

## Clarifications

### Session 2026-05-24
* Q: How does the CMS identify which visual components are available? -> A: Code-First Discovery via a Block Registry API.
* Q: What is the delivery mechanism for template deployment? -> A: Contextual Webhook Trigger per HostedSite.
* Q: Can a single Page Template be used by multiple different Content Types? -> A: Strict 1-to-1 Mapping.
* Q: How much control should users have over visual styling of blocks? -> A: Schema-Driven Styling.
* Q: How is the final data delivered to the frontend? -> A: CMS-side resolution. The frontend requests a page, and the CMS delivers a fully hydrated block tree.

## User Scenarios & Testing *(mandatory)*

### User Story 1: Visual Template Assembly (Priority: P1)

As a Content Architect, I want to visually assemble a page template by selecting and arranging predefined building blocks so that I can define the structure of a landing page without writing code.

**Why this priority**: Core "Builder" functionality.

**Independent Test**: Fully tested by creating a new template, adding three different blocks, reordering them, and saving the template configuration.

**Acceptance Scenarios**:
1.  **Given** I am in the Template Builder, **When** I click "Add Block", **Then** I see a list of available visual components (e.g., Hero, Gallery, CTA).
2.  **Given** a template with multiple blocks, **When** I drag a block to a new position, **Then** the visual order of the template is updated and persisted.
3.  **Given** an assembled template, **When** I save it, **Then** it appears in the "Templates" list with a unique identifier.

### User Story 2: Schema Association (Priority: P2)

As a Developer, I want to map the building blocks in a template to specific fields in a Content Type schema so that the template knows where to fetch its data from.

**Why this priority**: Enables the "CMS" integration.

**Independent Test**: Tested by creating a Content Type, creating a Template, and successfully linking a "Headline" block property to a "Promo Title" field.

**Acceptance Scenarios**:
1.  **Given** a block in a template, **When** I open its settings, **Then** I can select a compatible field from an associated Content Type schema to bind to the block's properties.
2.  **Given** a template-to-schema mapping, **When** the schema changes (e.g., a field is deleted), **Then** the Template Builder highlights the broken association.

### User Story 3: Deployment to Frontend (Priority: P3)

As a Content Manager, I want to "Publish" a template so that it becomes available and active on the connected frontend applications.

**Why this priority**: Necessary for the feature to deliver value to the live site.

**Independent Test**: Tested by clicking "Deploy" on a template and verifying the specific HostedSite environment receives the update signal.

**Acceptance Scenarios**:
1.  **Given** a saved template, **When** I click "Deploy", **Then** the system triggers a synchronization event to the specific registered HostedSite.
2.  **Given** a deployed template, **When** I view the deployment status, **Then** I see a confirmation that the frontend environment has acknowledged the configuration.

### Edge Cases
* **Block Incompatibility**: System must prevent mapping complex array blocks to flat string fields in the UI.
* **Concurrent Editing**: System must implement an optimistic concurrency control lock to prevent two users from overwriting the same template layout simultaneously.

## Requirements *(mandatory)*

### Functional Requirements

* **FR-001**: System MUST provide a "Template Library" view to manage page templates.
* **FR-002**: System MUST allow users to select from a registry of "Building Blocks".
* **FR-003**: System MUST allow defining "Slots" within a template where blocks can be dropped.
* **FR-004**: System MUST allow associating a Template with exactly one primary Content Type schema.
* **FR-005**: System MUST provide a mapping interface to link Block Properties to Schema Fields.
* **FR-006**: System MUST expose a Block Registry API endpoint (e.g., `POST /api/blocks/register`) to accept block manifest files containing block schemas and thumbnail references from frontend applications during their CI/CD pipeline.
* **FR-007**: System MUST deploy templates via a Webhook Trigger mechanism contextual to the `HostedSite` environment associated with the `Tenant`.
* **FR-008**: System MUST support "Alexandria" design system tokens for all builder UI elements.
* **FR-009**: System MUST validate that all required block properties are mapped to schema fields before allowing deployment.
* **FR-010**: System MUST support multi-tenant isolation.
* **FR-011**: System MUST provide a Content Delivery API endpoint that accepts a Content Item ID, resolves its associated PageTemplate, maps the schema data to the BlockInstances, and returns a fully hydrated block tree for frontend rendering.
* **FR-012**: If a synchronized block manifest omits a previously registered block, the system MUST retain the block definition, mark it as 'Deprecated', prevent new usage, keep existing templates intact, and display a warning in the builder UI.

### Key Entities

* **PageTemplate**: Represents the structural definition of a page.
* **BuildingBlock**: A reusable UI component definition registered via the API.
* **BlockInstance**: A specific usage of a BuildingBlock within a PageTemplate.
* **TemplateDeployment**: Tracks the history, status, and target `HostedSite` of template pushes to frontend environments.

## Success Criteria *(mandatory)*

### Measurable Outcomes
* **SC-001**: A non-technical user can assemble a 5-block landing page template in under 10 minutes.
* **SC-002**: 100% of block properties can be mapped to valid Content Type fields via the UI.
* **SC-003**: Template deployment signal reaches the specific HostedSite application within 5 seconds.
* **SC-004**: System supports at least 50 concurrent templates per tenant without UI performance degradation.

## Assumptions
* **Alexandria Foundation**: The Builder UI uses the existing Alexandria design system.
* **Headless Delivery via CMS Resolution**: Frontend applications are dumb receivers; the CMS handles merging Content Data with Template Layouts before payload delivery.
* **Existing Architecture**: Content Types, Tenants, and HostedSites already exist within the standard CMS flow.
* **Field Mapping Depth (V1)**: Initial release restricts schema mapping to flat fields (Strings, Numbers, Media). Nested repeaters or array-to-array block mapping will be deferred to V2 to control UI scope.