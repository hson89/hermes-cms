# Implementation Plan: Template Builder Engine

**Branch**: `006-template-builder` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-template-builder/spec.md`

**Note**: This plan is based on `.specify/templates/plan-template.md` and feature requirements.


## Summary

Implementation of a visual Template Builder Engine within Hermes CMS. This feature allows Content Architects to assemble page structures using registered building blocks and map them to Content Type schemas via a strict 1-to-1 mapping. Key technical components include:
- **Block Registry API**: Supports code-first discovery with a "diffing" phase to deprecate orphaned blocks (FR-012).
- **Builder UI**: Custom React-based workspace using Alexandria design system and dnd-kit.
- **Resolution Engine**: CMS-side hydration of block trees for frontend delivery (FR-011).
- **Deployment**: Webhook-based signaling via modified `HostedSites` configurations.

## Technical Context

**Language/Version**: TypeScript 6.0+, Node.js 26+
**Primary Dependencies**: Payload CMS 3.84+, React 19.2+, dnd-kit (for Builder UI)
**Storage**: PostgreSQL 18 (via Payload Collections)
**Testing**: Jest (Unit/Integration), Playwright (E2E for UI)
**Target Platform**: Web (Next.js/Payload Admin)
**Project Type**: web-service (Payload CMS extension)
**Performance Goals**: <200ms for hydrated block tree resolution (FR-011)
**Constraints**: 
- **Multi-tenant isolation**: Logical (standard Payload patterns).
- **OCC**: Optimistic Concurrency Control via a custom `version` field and `if-unmodified-since` header validation in `PageTemplates` hooks.
- **Data Integrity**: Enforce strict 1-to-1 `hasOne` relationship between `PageTemplate` and `ContentType`.
- **UI**: Alexandria tokens (no-border rule).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Condition | Status |
|-----------|-----------|--------|
| Multi-tenancy | All collections must include `tenant` relationship and access control. | ✅ PASS |
| AI-First | Template structures should be readable/manipulatable by the AI service (via JSON). | ✅ PASS |
| API-First | Delivery via `Content Delivery API` returning JSON block trees. | ✅ PASS |
| Test-First | TDD mandatory; unit tests for resolution engine, Playwright for builder. | ✅ PASS |
| DDD Boundaries | Service logic (Deployment, Resolution) encapsulated in service layer. | ✅ PASS |
| Hybrid Arch | Template events (Publish) can trigger Kafka events if needed. | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/006-template-builder/
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # Data entities
├── quickstart.md        # Feature bootstrap
├── contracts/           # API definitions
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
apps/content-management-engine/
├── src/
│   ├── collections/
│   │   ├── PageTemplates/     # Template structure (1-to-1 with ContentType)
│   │   ├── BuildingBlocks/    # Block definitions
│   │   ├── TemplateDeployments/ # History
│   │   └── HostedSites/       # Modifying to add webhook triggers
│   ├── components/
│   │   └── Builder/           # Builder UI components
│   ├── services/
│   │   ├── template_service.ts # Resolution engine & block diffing logic
│   │   └── deployment_service.ts # (Extended for TemplateDeployment)
└── app/(payload)/api/
    ├── blocks/            # Registry endpoint (POST /api/blocks/register)
    └── content/[id]/hydrate/ # Delivery endpoint for frontend hydration (FR-011)
```

**Structure Decision**: Integrated Monolith extension. The Builder UI lives in `apps/content-management-engine/src/components/Builder` and is registered as a custom Payload view. Logic is encapsulated in `template_service.ts`.


## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations detected. The hybrid monolith + microservice boundaries and multi-tenant constraints are strictly respected.

