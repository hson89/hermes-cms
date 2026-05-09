<!--
Sync Impact Report:
- Version change: 1.0.0 -> 1.1.0
- Added sections: VI. Strict Domain-Driven Design (DDD), VII. Microservices Architecture
- Removed sections: N/A
- Templates requiring updates: ✅ None
- Follow-up TODOs: None
-->
# Multi-tenant Headless CMS Constitution

## Core Principles

### I. Multi-tenancy by Default
Every feature, data model, and API endpoint MUST be designed with multi-tenancy in mind from day one. Data must be physically isolated at the schema level within PostgreSQL. No cross-tenant data bleed is acceptable.

### II. AI as a First-Class Citizen
The conversational AI agent is not an add-on; it is the primary interface for content schema design and initial content drafting. All underlying APIs and data structures must support rapid, context-aware AI interactions.

### III. API-First Content Delivery
The CMS is strictly headless. Content delivery MUST be exposed via robust, read-only JSON APIs. No assumptions should be made about the consuming front-end application.

### IV. Test-First (NON-NEGOTIABLE)
Test-Driven Development (TDD) is mandatory. Tests must be written before implementation, focusing heavily on tenant isolation, AI orchestration, and API response performance.

### V. Developer Experience (DX) for Tenants
The platform must provide a frictionless experience for developers building on top of it. This includes managed front-end starter templates, comprehensive documentation, and predictable API structures.

### VI. Strict Domain-Driven Design (DDD)
The codebase MUST adhere strictly to Domain-Driven Design principles. Business logic must be encapsulated within distinct Bounded Contexts, utilizing clear Aggregates, Entities, and Value Objects. Domain events MUST be used for cross-aggregate communication to decouple domain logic.

### VII. Microservices Architecture
The system MUST be designed as a set of independent, loosely coupled microservices. Each microservice MUST own its own data (database per service pattern) and correspond to a specific Bounded Context defined by DDD. Inter-service communication MUST rely on asynchronous event-driven mechanisms or well-defined, versioned REST/gRPC APIs, strictly avoiding synchronous coupling where possible.

## Multi-tenancy Architecture

All database queries MUST explicitly include the tenant context (e.g., via schema routing in Prisma).
Authentication mechanisms must issue tenant-scoped tokens. Cross-tenant access is strictly prohibited at the database level. Each microservice must independently enforce multi-tenancy rules.

## AI Integration

The AI agent will communicate with external LLMs (e.g., OpenAI). All interactions must be logged in `AIAgentSession` for context continuity.
The AI is restricted to modifying content and schemas within the active tenant's context only.

## Development Workflow

All new features must begin with a formal specification (`spec.md`) and implementation plan (`plan.md`) under `specs/`.
Pull requests must pass all unit and integration tests, specifically those validating tenant isolation. The plan MUST detail the Bounded Context and Microservice boundaries impacted by the feature.

## Governance

This Constitution supersedes all other practices. Any architectural deviation, especially regarding multi-tenancy, the AI copilot workflow, DDD boundaries, or microservices isolation, requires a formal amendment to this document and approval.

All PRs/reviews must verify compliance with the physical isolation requirement and strict DDD boundary enforcement. Complexity must be justified in the feature's `plan.md`.

**Version**: 1.1.0 | **Ratified**: 2026-05-09 | **Last Amended**: 2026-05-09
