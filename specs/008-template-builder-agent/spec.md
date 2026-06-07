# Feature Specification: Template Builder Agent

**Feature Branch**: `008-template-builder-agent`  
**Created**: 2026-06-07  
**Status**: Draft  
**Input**: User description: "help me create an agent that specialize in template builder where it take the html design and convert in to a suitable format to be able to resued across all tenant, including create or update approriate content type schema http://localhost:3000/admin/collections/page-templates?limit=10&depth=1"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - HTML Design Analysis & Content Schema Generation (Priority: P1)

As a Tenant Developer, I want to submit a raw HTML design page to the Template Builder Agent so that it automatically analyzes the page layout and generates or updates a content type schema that represents all the dynamic data areas (e.g., headings, copy text, imagery, CTA buttons) without manual configuration.

**Why this priority**: Foundational capability. An agent must first be able to identify dynamic fields in a design to construct the backend content schema.

**Independent Test**: Can be fully tested by sending a landing page HTML design to the agent, verifying that the agent returns a valid Content Type schema containing fields corresponding to the visual design elements.

**Acceptance Scenarios**:

1. **Given** a raw HTML template string with visual content, **When** analyzed by the agent, **Then** a content type schema is generated containing appropriate field definitions (e.g., text for titles, richText for body paragraphs, upload for image sources).
2. **Given** an existing Content Type schema and an updated HTML template with new visual sections, **When** submitted to the agent, **Then** the agent updates the Content Type schema to add the new fields while preserving unmodified ones.
3. **Given** a design containing a list pattern (e.g. three feature columns), **When** analyzed, **Then** the agent creates a structured array/repeater field in the content schema rather than flat individual fields.

---

### User Story 2 - Parameterized Page Template Generation (Priority: P2)

As a Content Architect, I want the agent to convert the raw HTML design into a parameterized template stored in a reusable Page Template collection, so that the design can be reused and populated with tenant-specific content items dynamically.

**Why this priority**: High value for multi-tenancy. Decouples the HTML layout from the content data, allowing tenants to reuse the visual layout structure with different content entries.

**Independent Test**: Can be tested by verifying that the agent outputs a saved Page Template document containing the parameterized HTML (with placeholder tokens replacing the raw content) linked to the correct Content Type.

**Acceptance Scenarios**:

1. **Given** an HTML design and a generated Content Type schema, **When** the Page Template is created, **Then** the raw content inside the HTML is replaced by matching placeholder tokens (e.g., `{{ heroTitle }}`) and saved in the template's HTML content field.
2. **Given** a Page Template generation request, **When** processed, **Then** a 1-to-1 relationship is established between the Page Template and its generated Content Type.
3. **Given** a newly generated Page Template, **When** listing templates for a tenant, **Then** it appears in the active template library.

---

### User Story 3 - External Agent & Tool Integration (Priority: P3)

As an External System or Assistant (such as Claude Desktop), I want to call a unified tool to convert an HTML design into a CMS-ready template and schema programmatically, ensuring strict tenant isolation.

**Why this priority**: Promotes the AI-First and API-First constitution principles by enabling external AI agents or automated scripts to run the template building pipeline.

**Independent Test**: Can be tested by invoking the template builder tool via the Model Context Protocol (MCP) server using tenant API credentials and verifying the schema and template are registered successfully in the CMS.

**Acceptance Scenarios**:

1. **Given** a tenant API key context, **When** the template builder tool is invoked with raw HTML design text, **Then** it registers both the Content Type schema and the Page Template in the CMS, scoped strictly to the active tenant.
2. **Given** an unauthorized or missing tenant API key context, **When** the tool is invoked, **Then** the request is rejected with an authentication error.

### Edge Cases

- **Poorly Structured/Malformed HTML**: If the submitted HTML is invalid, the agent must clean or heal the HTML before generating the template and schema, or return helpful validation diagnostics.
- **Colliding Slugs**: If the generated content type slug or template slug already exists within the tenant, the agent should prompt to update the existing one or suggest an alternative unique slug (e.g. appending a suffix).
- **Complexity in Lists/Arrays**: Deeply nested lists (lists within lists) must be mapped to nested arrays or rejected with a clean limitation warning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse HTML designs to extract dynamic content sections (headings, paragraphs, images, buttons).
- **FR-002**: System MUST generate a valid Content Type schema containing fields corresponding to the extracted dynamic sections.
- **FR-003**: System MUST identify repeated structures (e.g., lists, grids) in the HTML and map them to array fields in the Content Type schema.
- **FR-004**: System MUST generate a parameterized version of the HTML, replacing dynamic content with placeholder tokens matching the schema field names.
- **FR-005**: System MUST create or update the Content Type entry in the CMS using the generated schema.
- **FR-006**: System MUST create or update a Page Template entry in the CMS containing the parameterized HTML and a 1-to-1 link to the Content Type.
- **FR-007**: System MUST enforce logical tenant isolation: all generated schemas and templates must be owned by and restricted to the active tenant.
- **FR-008**: System MUST expose the template builder capability as a discoverable tool via the Model Context Protocol (MCP) server.
- **FR-009**: System MUST support conversational refinement, allowing users to modify the generated template and schema iteratively.

### Key Entities *(include if feature involves data)*

- **PageTemplate**: A CMS entity representing the visual page layout, containing parameterized HTML, metadata, and a relationship to the associated ContentType.
- **ContentType**: A CMS entity defining the structured schema (fields, types, validation) for content items of this type.
- **BuildingBlock**: Reusable visual components that can be composed within layouts (optional reference in PageTemplate mappings).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The agent parses HTML and registers the schema and template in under 15 seconds.
- **SC-002**: 100% of extracted dynamic fields are correctly typed (images as upload relationships, text blocks as richText, headings as text).
- **SC-003**: Multi-tenant security is 100% enforced: templates/schemas are strictly isolated to the authenticated tenant.
- **SC-004**: Converters are fully accessible via MCP toolcalls for direct agent-to-agent automation.

## Assumptions

- **Parameterization Format**: The generated parameterized HTML uses standard curly brace syntax (e.g., `{{ fieldName }}`).
- **HTML Semantics**: The input HTML uses reasonably standard semantic elements to assist the agent in identifying dynamic sections.
- **CMS Availability**: The Payload CMS monolith is online and accessible via internal API endpoints.
