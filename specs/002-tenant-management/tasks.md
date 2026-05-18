# Tasks: Tenant Management

**Input**: Design documents from `/specs/002-tenant-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification

- [X] T001 Verify `apps/content-management-engine` project structure and access to core collections
- [X] T002 [P] Verify `@payloadcms/plugin-multi-tenant` is configured in `apps/content-management-engine/src/payload.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for logging and base models

- [X] T003 Create `AuditLogs` collection in `apps/content-management-engine/src/collections/AuditLogs/index.ts` per `data-model.md`
- [X] T004 [P] Unit test for `AuditLogs` access control in `apps/content-management-engine/src/collections/AuditLogs/access.test.ts`
- [X] T005 Register `AuditLogs` in `apps/content-management-engine/src/payload.config.ts`
- [X] T006 Create `tenant-service.ts` skeleton in `apps/content-management-engine/src/services/tenant-service.ts`
- [X] T007 [P] Unit test for domain resolution logic in `apps/content-management-engine/src/services/tenant-service.test.ts`
- [X] T008 Configure `AuditLogs` access control (Super Admin read only, no public create)

**Checkpoint**: Foundation ready - User Story implementation can begin

---

## Phase 3: User Story 1 - Create and Initialize Tenant (Priority: P1) 🎯 MVP

**Goal**: Super Admins can create isolated tenant workspaces with basic identity

**Independent Test**: Create a tenant via Admin UI and verify it appears in the list with correct slug and name

### Implementation for User Story 1

- [X] T009 [US1] Update `Tenants` collection in `apps/content-management-engine/src/collections/Tenants/index.ts` with `status`, `tier`, and `defaultLocale` fields
- [X] T010 [US1] Implement Super Admin only access control for `Tenants` mutation in `apps/content-management-engine/src/collections/Tenants/index.ts`
- [X] T011 [US1] Add validation for `slug` uniqueness and format in `Tenants` collection
- [X] T012 [US1] Implement `Archived` soft-delete logic by updating `delete` access in `Tenants` collection
- [X] T013 [P] Unit test for `Tenants` collection schema and validation in `apps/content-management-engine/src/collections/Tenants/schema.test.ts`
- [X] T014 [P] Unit test for `Tenants` access control (Super Admin isolation) in `apps/content-management-engine/src/collections/Tenants/access.test.ts`
- [X] T015 [P] Integration test for tenant soft-delete (`Archived` status)

---

## Phase 4: User Story 2 - Domain Configuration (Priority: P2)

**Goal**: Map multiple domains to a tenant for branded access

**Independent Test**: Map a domain to a tenant and verify `GET /api/tenants/resolve?hostname=...` returns the correct tenant ID

### Implementation for User Story 2

- [X] T016 [US2] Add `domains` array field to `Tenants` collection in `apps/content-management-engine/src/collections/Tenants/index.ts` (hostname, isPrimary)
- [X] T017 [US2] Implement custom validation for domain format and tier-based uniqueness/limits in `Tenants` collection
- [X] T018 [US2] Implement `resolveTenantByHostname` with `slug` fallback in `apps/content-management-engine/src/services/tenant-service.ts`
- [X] T019 [US2] Create resolution API endpoint in `apps/content-management-engine/src/app/(payload)/api/tenants/resolve/route.ts` per `contracts/tenant-resolution.md`
- [X] T020 [US2] Add `X-Internal-Secret` validation to the resolution endpoint
- [X] T021 [P] Integration test for domain resolution and slug fallback in `tests/integration/tenant-resolution.test.ts`

---

## Phase 5: User Story 3 - Workspace Customization (Priority: P2)

**Goal**: Configure branding (logo, color) and operational status for each tenant

**Independent Test**: Update tenant branding and verify the branding fields are returned in the resolution API

### Implementation for User Story 3

- [X] T022 [US3] Add `branding` group field (logo relationship to `media`, primaryColor hex) to `Tenants` collection
- [X] T023 [US3] Implement status-based access gate in `apps/content-management-engine/src/services/tenant-service.ts` to block `suspended`/`archived` tenants
- [X] T024 [US3] Update resolution API to return branding metadata as per contract

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Impersonation, audit logging, and final validation

- [X] T025 Implement logic in `tenant-service.ts` to log resolution failures to `AuditLogs`
- [X] T026 [P] Implement Super Admin impersonation logic using Payload `overrideAccess`
- [X] T027 Add `isImpersonated` flag and audit logging for all actions performed during impersonation
- [X] T028 [P] Final documentation updates and `quickstart.md` validation
- [X] T029 Perform security review of tenant isolation ACLs
- [X] T030 [P] Verify SC-001 (Tenant configuration under 120s) via timed manual walkthrough
- [X] T031 [P] Load test for resolution API to verify SC-005 (< 50ms @ 50 concurrent)
- [X] T032 [P] End-to-end test for full tenant onboarding flow using Playwright

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Pre-requisite for everything.
- **Phase 2 (Foundational)**: BLOCKS Phase 3-6.
- **Phase 3 (US1)**: Must be completed to provide the Tenant entity for other stories.
- **Phase 4 & 5**: Can run in parallel once US1 is functional.
- **Phase 6 (Polish)**: Depends on completion of core features.

### Parallel Opportunities
- T002 and T003 can start together.
- T026 and T028 can be worked on in parallel with other polish tasks.
- Once the schema is updated (T009, T016, T022), frontend/UI integration tasks (if any) can proceed in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 & 2)
1. Complete Foundational work (Phase 2).
2. Complete US1 (Tenant creation).
3. Complete US2 (Domain mapping & resolution).
4. **Validation**: Test domain resolution for a newly created tenant.

### Incremental Delivery
1. Foundation -> Core ID management ready.
2. US1 -> Onboarding possible.
3. US2 -> Branded access enabled.
4. US3 -> White-labeling & Operational control.
5. Polish -> Enterprise readiness (Audit, Impersonation).
