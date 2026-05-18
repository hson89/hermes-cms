# Research: Define Content Types

## Decision 1: Dynamic Content Validation Strategy
- **Decision**: Implement a custom dynamic schema validator inside a `beforeValidate` hook in the `ContentItems` collection.
- **Rationale**: Dynamic schema definitions cannot be compiled into static DB tables at runtime without restarting the CMS server. By keeping `ContentItems` as a generic document store with a flexible `content` JSON structure, we can validate user input at the application layer by checking the active schema registered in the linked `ContentType` document.
- **Alternatives considered**: Dynamic Config Compilation (writing new collection files and executing hot-reloads). Rejected because hot-reloading Next.js/Payload server in production introduces service downtime, cold starts, and potential configuration lockups, which violates the system health guidelines.

## Decision 2: AI Suggestion Self-Correction Loop
- **Decision**: Implement a schema validator in the FastAPI AI Microservice using a strict Pydantic model and allowed type registry. When the LLM outputs a schema, the service parses and validates it. If validation fails (e.g., unsupported field type, missing labels), it launches a corrective feedback loop (up to 3 retries) prompting the LLM with the specific validation error.
- **Rationale**: Ensures FR-009 is fully met on the backend before the client preview is generated, preventing frustrating user experiences with broken models.
- **Allowed Types Registry**: `text`, `number`, `boolean`, `date`, `richText`, `json`, `relationship`, `select`, `upload`, `array`, `blocks`.

## Decision 3: Preventing Destructive Schema Changes
- **Decision**: Implement a `beforeChange` verification hook in the `ContentTypes` collection.
- **Rationale**: Satisfies FR-010. When an editor attempts to update a published `ContentType` schema, the hook queries `ContentItems` to see if existing entries exist. If they do, a semantic diff is run:
  - If any existing field name is removed: BLOCKED.
  - If a field's type is changed to an incompatible type (e.g., text to relationship, number to date): BLOCKED.
  - If a required constraint is added to a field that previously did not have it: BLOCKED (unless a default value is supplied).
- **Alternatives considered**: Soft blocking (warning only). Rejected because actual data corruption would occur in existing content entries.

## Decision 4: Optimistic Concurrency Control
- **Decision**: Implement a pre-save check that compares the client-submitted `updatedAt` timestamp against the current database value.
- **Rationale**: Satisfies FR-012. Prevents last-write-wins collisions when multiple editors are refining schemas concurrently. If a mismatch is detected, returns a `409 Conflict` error and forces the user to reload the draft.

## Decision 5: Exporting Formats
- **Decision**: Build an export helper under `apps/cms/src/services/export-service.ts` exposing two formats:
  - `JSON`: Standard JSON schema representation.
  - `TypeScript`: A transpiler that outputs a string of valid Payload CMS 3.x `CollectionConfig` code with properly typed fields (e.g. `import type { CollectionConfig } from 'payload'`).
- **Rationale**: Provides developers with a flawless bridge from AI design to code integration, improving DX (Principle V).

## Needs Clarification (Resolved)
- **Complex Nested Structures**: AI service must structure arrays and blocks by wrapping sub-fields recursively in the JSON schema.
- **Tenant Scope for API Keys**: Delivery APIs must validate that the API Key belongs to the tenant matching the requested content's tenant context.
