# Changelog

All notable changes to the **Hermes AI** project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses standard Conventional Commits.

---

## [0.2.0] - 2026-05-17
### Multi-Tenant Management Feature Track (`002-tenant-management`)

This feature track implements the core multi-tenancy management foundation for Hermes AI. It provides Super Admins with the capabilities to create logically isolated tenant workspaces, map multiple branded domains with tier-based limit enforcement, manage operational lifecycles, and render a high-end bespoke CMS admin interface matching the **Alexandria — High-End Editorial** design guidelines.

> [!NOTE]
> All changes are fully covered by a Test-Driven Development (TDD) cycle with **64/64 passing integration and unit tests** verifying logical isolation, schema validations, and resolution performance.

---

### Added

#### 1. Core Data Models & Schema Extensions (`apps/cms/src/collections/`)
- **[NEW] `AuditLogs` Collection** ([AuditLogs](file:///home/itlight/dev/hermes-cms/apps/cms/src/collections/AuditLogs/index.ts)): Added a centralized collection to track platform-wide administrative actions, domain resolution failures, and tenant impersonation logs.
- **[MODIFY] `Tenants` Collection** ([Tenants](file:///home/itlight/dev/hermes-cms/apps/cms/src/collections/Tenants/index.ts)): Extended schemas with crucial fields:
  - `status`: Lifecycle mapping (`active`, `suspended`, `archived`) supporting custom soft-delete logic.
  - `tier`: Service tiers (`standard`, `premium`, `enterprise`).
  - `defaultLocale`: Locale preferences (`en`, `es`, `fr`, `de`).
  - `domains`: Sub-collection array mapping hostnames with global uniqueness and tier-based limits (Standard: 10, Premium: 50, Enterprise: Unlimited).
  - `branding`: Customized workspace assets (relationships to `media` for logo, hex value regex validations for `primaryColor`).

#### 2. Services & API Resolution Endpoints (`apps/cms/src/services/` & `apps/cms/src/app/`)
- **[NEW] Tenant Service (`tenant-service.ts`)** ([tenant-service.ts](file:///home/itlight/dev/hermes-cms/apps/cms/src/services/tenant-service.ts)):
  - Optimized domain resolution service utilizing in-memory cache to guarantee `< 50ms` resolution times (SC-005).
  - Implemented slug-fallback lookup and status-based access gating to gracefully block access to suspended/archived workspaces.
  - Built high-safety Super Admin impersonation engine leveraging Payload's `overrideAccess`.
- **[NEW] Resolution API Route** ([route.ts](file:///home/itlight/dev/hermes-cms/apps/cms/src/app/(payload)/api/tenants/resolve/route.ts)):
  - Built endpoint `GET /api/tenants/resolve?hostname=...` for fast external gateway mapping.
  - Integrated `X-Internal-Secret` header authentication for CMS-to-AI microservice communications.

#### 3. Alexandria Bespoke Admin UI & Layout Cleanups (`apps/cms/src/components/views/` & `apps/cms/src/app/`)
- **[MODIFY] Tenant List View (`TenantListPage.tsx`)** ([TenantListPage.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/views/TenantListPage.tsx)):
  - Crafted high-fidelity editorial registry page featuring Noto Serif headlines and alternating tonal cards (the "No-Line" rule).
  - Implemented Public Sans status tags, tier badges, debounced search, status-tier filters, and an interactive decommissioning modal with a double-confirmation slug check.
- **[MODIFY] Tenant Creation/Edit Wizard (`CreateTenantPage.tsx`)** ([CreateTenantPage.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/views/CreateTenantPage.tsx)):
  - Integrated interactive step navigation (Identity -> Domains -> White-Labeling).
  - Added live domain-limit meters, real-time slug format validation, and high-fidelity, real-time branded sidebar preview cards.
- **[MODIFY] Global Custom Layout Reset (`globals.css`)** ([globals.css](file:///home/itlight/dev/hermes-cms/apps/cms/src/app/globals.css)):
  - Registered `.custom-tenant-view` reset styles using modern CSS `:has()` pseudo-class rules. Hides default Payload CMS gutters, headers, and title bars cleanly while retaining the `18rem` responsive desktop sidebar offset.

---

### Technical Guardrails & Security Enforcement

| Principle / Area | Technical Enforcer | Constitutional Rule |
| :--- | :--- | :--- |
| **Logical Multi-tenancy** | Payload ACLs restricting reading/writing to `tenant` relationship matches | Principle I: Multi-tenancy by Default |
| **Header Authentication** | Verification of matching `X-Internal-Secret` in all resolution requests | Principle VII: Monolith-to-Service Security |
| **Operational Gating** | Active checks blocking resolving requests for `suspended` and `archived` tenants | Spec-002: Operational Lifecycles |
| **Visual Elegance** | Glassmorphism surfaces, custom `#094cb2` gradients, Outfit/Public Sans badges | DESIGN.md: Alexandria High-End Editorial |

---

### Test-Driven Development (TDD) Highlights
- **100% Pass Rate**: Verified 64 unit, integration, and contract tests in `apps/cms` under Jest:
  - `schema.test.ts`: Checked strict alphanumeric validation, lowercase slug restrictions, and domain format checks.
  - `access.test.ts`: Confirmed non-admin users cannot mutationally access system tenant details.
  - `tenant-resolution.test.ts`: Verified hostname resolution, slug fallback, and internal secret verification.
  - `test_tenant_soft_delete.ts`: Checked that "decommissioned" tenants are marked `archived` rather than physically deleted.
  - `audit-logging.test.ts`: Checked that all resolution failures and impersonation sessions write structured metadata to `AuditLogs`.
