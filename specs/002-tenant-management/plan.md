# Implementation Plan: Tenant Management

**Branch**: `002-tenant-management` | **Date**: 2026-05-16 | **Spec**: [spec.md](file:///home/itlight/dev/hermes-cms/specs/002-tenant-management/spec.md)
**Input**: Feature specification from `/specs/002-tenant-management/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature implements the core multi-tenancy management for Hermes AI. It provides Super Admins with the tools to create isolated tenant workspaces, map multiple branded domains to those workspaces, and manage their lifecycle (Active, Suspended, Archived). The technical approach involves extending the Payload CMS `Tenants` collection and implementing a domain resolution service to enforce logical isolation across the platform.

## Technical Context

**Language/Version**: TypeScript 6.0+, Node.js 26+  
**Primary Dependencies**: Payload CMS 3.84+, `@payloadcms/plugin-multi-tenant`, Tailwind CSS 4.3  
**Storage**: PostgreSQL 18 (logical isolation)  
**Testing**: Jest 30, Playwright 1.59 (TDD workflow)  
**Target Platform**: Linux / Docker  
**Project Type**: Headless CMS (Web Service)  
**Performance Goals**: API tenant resolution < 50ms (Internal Cache optimized)  
**Constraints**: Logical isolation via ACLs; tier-based domain limits (standard: 10, premium: 50, enterprise: unlimited).
**Data Model Extensions**: DefaultLocale (per tenant), Tiered Domain Limits, Soft-delete (Archived status).
**Scale/Scope**: Initial support for up to 100 tenants with primary and secondary domains.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Multi-tenancy by Default**: PASSED. This feature is the foundation of multi-tenancy.
2. **AI as a First-Class Citizen**: PASSED. Tenant management will enable AI context per tenant.
3. **API-First Content Delivery**: PASSED. Strictly headless delivery endpoints.
4. **Test-First (TDD)**: PASSED. All scenarios will be tested before implementation.
5. **DX for Tenants**: PASSED. Branding and URL customization improve tenant experience.
6. **Strict DDD**: PASSED. Tenant logic belongs to the core identity bounded context.
7. **Hybrid Architecture**: PASSED. This feature resides in the CMS monolith as it concerns the core data model.

## Project Structure

### Documentation (this feature)

```text
specs/002-tenant-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/cms/
├── src/
│   ├── collections/
│   │   ├── Tenants.ts          # Core tenant model
│   │   ├── Users.ts            # Tenant-scoped users
│   │   └── AuditLogs.ts        # Centralized audit logging
│   ├── services/
│   │   └── tenant-service.ts   # Domain resolution and management logic
│   └── payload.config.ts       # Multi-tenant plugin configuration
```

**Structure Decision**: The feature is implemented within the `apps/cms` monolith as it leverages Payload CMS's native multi-tenancy and collection systems.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |
