# Research: Template Builder Engine

## Decision: Block Registry API
**Chosen**: `POST /api/blocks/register` endpoint in the CMS Monolith.
**Rationale**: Simplifies the auth loop (uses existing CMS API keys/tokens) and allows immediate validation against the `BuildingBlock` collection.
**Alternatives considered**:
- **Kafka stream**: Overkill for occasional CI/CD registrations; synchronous feedback is better for CI pipeline failure detection.
- **GitOps (Sidecar)**: Harder to manage across multi-tenant environments; API-first is cleaner for diverse frontend stacks.

## Decision: Deployment Mechanism
**Chosen**: Contextual Webhook Trigger + `TemplateDeployment` log.
**Rationale**: Existing `DeploymentService` uses a similar pattern for `HostedSites`. Extending this ensures consistency. We will add a `webhooks` field to `HostedSite` for template sync notification.
**Alternatives considered**:
- **Direct Build Trigger**: The CMS should remain headless and not manage frontend build servers directly. Webhooks provide the necessary decoupling.

## Decision: Data Resolution
**Chosen**: CMS-side "Hydrated Block Tree" resolution.
**Rationale**: Required by spec FR-011. Simplifies frontend implementation by offloading the "joining" of Content Item data and Template layout to the server.
**Alternatives considered**:
- **Frontend-side resolution**: Requires multiple API calls from the frontend (get content, get template, join), increasing latency and complexity.

## Decision: Builder UI
**Chosen**: Custom Payload View using `AdminView` and Alexandria design system.
**Rationale**: Adheres to `GEMINI.md` guardrails. Alexandria's tonal layering (no-border rule) is well-suited for a clean builder workspace.
**Alternatives considered**:
- **External Builder App**: Introduces auth overhead and context-switching. Keeping it within the Payload Admin UI provides a unified experience for Content Architects.

## Decision: Dnd-Kit Interaction & Collision Logic
**Findings**:
- **Index Collision**: Dropping a new item from the palette directly over an existing block instance was yielding the child ID as the target.
- **Solution**: The `handleDragEnd` logic was refactored to check for `library-` prefixes and calculate the insertion index by matching the `over.id` against the existing `instanceId` array. If no match is found (e.g., dropped on empty space), the item is appended.
- **Pointer Activation Distance**: To prevent micro-movements from triggering drag states during simple clicks (for mapping/settings), a `PointerSensor` with an 8px activation distance constraint was implemented.

## Technical Context Resolution
- **Project Structure**: Integrated into `apps/content-management-engine`.
- **Primary Dependencies**: `payload` (Core), `react` (Builder UI), `dnd-kit` (Drag & Drop functionality - recommended for React).
- **Storage**: PostgreSQL (via Payload Collections).
- **Testing**: `jest` + `playwright` (E2E for builder).
