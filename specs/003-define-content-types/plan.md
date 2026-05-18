# Implementation Plan: Define Content Types

**Branch**: `003-define-content-types` | **Date**: 2026-05-17 | **Spec**: [spec.md](file:///home/itlight/dev/hermes-cms/specs/003-define-content-types/spec.md)
**Input**: Feature specification from `/specs/003-define-content-types/spec.md`

**Note**: This plan is filled in and finalized under the `/speckit-plan` workflow.

## Summary

This feature implements AI-assisted and visual schema modeling for Hermes AI Content Types. It allows Content Architects to define schemas in natural language, which are processed by the FastAPI AI Microservice using LangChain 1.2+ to suggest structured models (supporting text, numbers, dates, booleans, relationships, selects, rich text, uploads, blocks, and arrays). The CMS monolith stores these schemas as isolated draft configurations within the `ContentTypes` collection until they are explicitly published. To guarantee stability, the system automatically rejects invalid AI-generated field types, prevents destructive changes to published models with existing content items, implements optimistic concurrency control for collaborative draft editing, and supports schema export as JSON and Payload-compatible TypeScript definitions.

## Technical Context

**Language/Version**: TypeScript 6.0+, Node.js 26+ (CMS Monolith); Python 3.14+ (AI Agent Microservice)  
**Primary Dependencies**: Payload CMS 3.84+, `@payloadcms/plugin-multi-tenant`, Tailwind CSS 4.3; FastAPI 0.136+, LangChain 1.2+, SQLAlchemy 2.0+, Alembic  
**Storage**: PostgreSQL 18 (2 separate databases: `hermes_cms` on port 5432, `hermes_ai` on port 5433)  
**Testing**: Jest 30, Playwright 1.59 (CMS); pytest 8.4+, httpx (AI service)  
**Target Platform**: Linux Server / Docker Compose / Kubernetes  
**Project Type**: Headless CMS (Monolith) + AI Microservice (REST + Kafka)  
**Performance Goals**: AI schema generation response < 15 seconds; dynamic field validation overhead < 30ms  
**Constraints**: Multi-tenancy enforced by logical tenant boundaries at database/ACL layer; retry limit on AI schema correction (max 3 retries); prevent destructive schema modifications when data is present.  
**Data Model Extensions**: `ContentTypes` fields (`status` for draft/published lifecycle, optimistic `version` or `updatedAt` check, `schema` validation hooks).  
**Scale/Scope**: Support complex nested fields (Payload Blocks/Arrays) and loose name-based relationship suggestions across 100+ tenants.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Multi-tenancy by Default**: PASSED. Both `ContentTypes` and `ContentItems` collections are registered in Payload's `multiTenantPlugin` in `payload.config.ts`, ensuring query/mutation tenant isolation.
2. **AI as a First-Class Citizen**: PASSED. The core schema design interface leverages the `generateSchemaEndpoint` to proxy natural language prompts directly to the LangChain-powered FastAPI service.
3. **API-First Content Delivery**: PASSED. Deliverable schemas and dynamic Content Items are served strictly via headless REST delivery APIs.
4. **Test-First (TDD)**: PASSED. Automated Jest/Playwright tests for schema validation and pytest unit tests for AI schema parser correction are scheduled first.
5. **DX for Tenants**: PASSED. Generates fully documented Payload-compatible TypeScript types and clean JSON exports, allowing tenant developers to easily consume models.
6. **Strict Domain-Driven Design (DDD)**: PASSED. AI schema generation maintains clean DDD layering (AI Agent Session domain aggregate, AIService application orchestrator, FastAPI request adapters).
7. **Hybrid Architecture**: PASSED. Core CMS handles data modeling persistence, while heavy LangChain processing and recursive self-correction live inside the FastAPI service, communicating over secure internal REST APIs (`X-Internal-Secret`).

## Project Structure

### Documentation (this feature)

```text
specs/003-define-content-types/
├── plan.md              # This file (completed implementation plan)
├── research.md          # Phase 0 output: decisions on schema dynamic validation & retries
├── data-model.md        # Phase 1 output: schemas for ContentTypes, ContentItems, and AI prompts
├── quickstart.md        # Phase 1 output: developer guide for creating schemas with AI
└── contracts/
    └── schema-generation.md  # Schema generation API contract between CMS and AI service
```

### Source Code (repository root)

```text
apps/cms/
├── src/
│   ├── collections/
│   │   ├── ContentTypes/
│   │   │   ├── index.ts        # ContentTypes Collection schema configuration
│   │   │   ├── hooks.ts        # Hooks for optimistic concurrency and destructive check
│   │   │   └── endpoints.ts    # Custom API endpoints (generate-schema, export)
│   │   └── ContentItems/
│   │       ├── index.ts        # ContentItems Collection schema configuration
│   │       └── validation.ts   # Dynamic field validation against active schema
│   └── services/
│       └── export-service.ts   # Export generator for JSON/TypeScript definitions

apps/ai-agent-service/
├── src/
│   ├── application/
│   │   └── ai_service.py       # Handles LangChain orchestration & self-correction retry loop
│   ├── domain/
│   │   ├── schema_validator.py # Validates suggested fields against allowed Payload types
│   │   └── repositories/
│   │       └── session_repository.py # Abstract repository interface (Strict DDD)
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   └── session_repository.py # SQLAlchemy session repository implementation
│   │   └── database.py         # DB connection & base model definitions
│   └── main.py                 # API request/response schema handlers
```

**Structure Decision**: Fully aligns with the hybrid model. CMS handles relational storage, dynamic schema validation hooks, and file generation, while the Python agent microservice owns LLM prompting, structure validation, and self-corrective generation loops.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations identified. The architecture perfectly conforms to the Hermes AI Constitution principles. | N/A |
