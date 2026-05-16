<!--
Sync Impact Report:
- Version change: 2.0.0 -> 2.1.0
- Modified sections: VII. Hybrid Architecture (Monolith + Microservices) replacing Modular Monolith.
- Added sections: N/A
- Removed sections: N/A
- Templates requiring updates: ✅ None
- Follow-up TODOs: Ensure inter-service communication (Payload <-> AI Microservice) is secure and well-defined.
-->
# Multi-tenant Headless CMS Constitution

## Core Principles

### I. Multi-tenancy by Default
Every feature, data model, and API endpoint MUST be designed with multi-tenancy in mind from day one. Data isolation for the CMS MUST be enforced logically within a shared database using the Payload CMS multi-tenant plugin patterns. Proper access control rules are paramount to prevent cross-tenant data bleed.

### II. AI as a First-Class Citizen
The conversational AI agent is not an add-on; it is the primary interface for content schema design and initial content drafting. All underlying APIs and data structures must support rapid, context-aware AI interactions.

### III. API-First Content Delivery
The CMS is strictly headless. Content delivery MUST be exposed via robust, read-only JSON APIs. No assumptions should be made about the consuming front-end application.

### IV. Test-First (NON-NEGOTIABLE)
Test-Driven Development (TDD) is mandatory. Tests must be written before implementation, focusing heavily on tenant isolation (logical boundaries), AI orchestration, and API response performance.

### V. Developer Experience (DX) for Tenants
The platform must provide a frictionless experience for developers building on top of it. This includes managed front-end starter templates, comprehensive documentation, and predictable API structures.

### VI. Strict Domain-Driven Design (DDD)
The codebase MUST adhere strictly to Domain-Driven Design principles, especially for backend microservices outside the core CMS. Business logic must be encapsulated within distinct Bounded Contexts, utilizing clear Aggregates, Entities, and Value Objects.

### VII. Hybrid Architecture (Monolith + Microservices)
The core Content Management System MUST be built as a modular monolith using Payload CMS. However, heavy backend processing, specifically the AI Agents and orchestration logic, MUST be implemented as independent microservices adhering to strict DDD principles. The CMS monolith and the AI microservices MUST communicate via asynchronous events (e.g., message brokers) or well-defined REST/gRPC APIs.

## Multi-tenancy Architecture

All database queries MUST explicitly include the tenant context, enforced through Payload CMS access control and logical filtering.
Authentication mechanisms must issue tenant-scoped tokens or attach tenant claims to user sessions. Cross-tenant access without explicit "Super Admin" privileges is strictly prohibited. Each module and microservice must independently respect the global multi-tenancy rules.

## AI Integration

The AI agent microservice will communicate with external LLMs (e.g., OpenAI). All interactions must be logged in `AIAgentSession` for context continuity within the AI Microservice's own data store.
The AI is restricted to modifying content and schemas within the active tenant's context only, communicating back to the Payload CMS via secure internal APIs.

## Development Workflow

All new features must begin with a formal specification (`spec.md`) and implementation plan (`plan.md`) under `specs/`.
Pull requests must pass all unit and integration tests, specifically those validating tenant logical isolation and microservice contracts. The plan MUST detail the Bounded Context and module boundaries impacted by the feature.

### System Health & Resource Management
A stable development environment is critical for AI-first orchestration. Developers and AI agents MUST proactively monitor system resources. If background processes (e.g., Payload generators) consume excessive CPU or cause file-system locks, they MUST be terminated and restarted cleanly using provided cleanup utilities.

## Governance

This Constitution supersedes all other practices. Any architectural deviation, especially regarding multi-tenancy, the AI copilot workflow, DDD boundaries, or the hybrid architecture design, requires a formal amendment to this document and approval.

All PRs/reviews must verify compliance with the logical isolation requirement (Access Control Lists) and strict DDD boundary enforcement for microservices. Complexity must be justified in the feature's `plan.md`.

**Version**: 2.1.0 | **Ratified**: 2026-05-09 | **Last Amended**: 2026-05-09