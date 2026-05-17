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

#### 3. Alexandria Bespoke Admin UI & Shared Registry Components (`apps/cms/src/components/`)
- **[MODIFY] Reusable Atomic `Badge` Component** ([Badge.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/ui/atoms/Badge.tsx)): Evolved the atomic `Badge` to be a highly versatile, generic component supporting custom sizing (`sm`, `md`), visual variants (`solid`, `subtle`, `outline`), curated semantic color states (`primary`, `tertiary`, `success`, `danger`, `warning`, `neutral`, `gold`), and embedded Google Material icons.
- **[NEW] Reusable Shared UI Components (`apps/cms/src/components/ui/`)**:
  - **`RegistryHeader`** ([RegistryHeader.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/ui/molecules/RegistryHeader.tsx)): An editorial-grade view header featuring Outfit/Public Sans typography and staggered soft-blur word entry animations.
  - **`RegistryTable`** ([RegistryTable.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/ui/organisms/RegistryTable.tsx)): A borderless grid-card hybrid registry container with decorative monogram avatars, flex column layouts, and high-fidelity pulse skeleton loading state.
  - **`FilterChips`** ([FilterChips.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/ui/molecules/FilterChips.tsx)): Generically typed visual status filtering controls utilizing premium color accents.
  - **`SearchInput`** ([SearchInput.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/ui/molecules/SearchInput.tsx)): A beautiful search text field with subtle debouncing to limit load refetches.
  - **`RegistryPagination`** ([RegistryPagination.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/ui/molecules/RegistryPagination.tsx)): High-end page controls for navigating multi-page listings.
  - **`ConfirmationModal`** ([ConfirmationModal.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/ui/organisms/ConfirmationModal.tsx)): A general-purpose glassmorphism dialog for danger-level double confirmation prompts (e.g. decommissioning).
- **[NEW] Custom User Registry View (`UserListPage.tsx`)** ([UserListPage.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/views/UserListPage.tsx)):
  - Built a customized identity admin interface displaying registered accounts with modern monogram avatars.
  - Refactored user role and tenant scoping chips to utilize the evolved atomic `Badge` component, aligning them perfectly with Alexandria design tokens.
  - Integrated full role filter chips, live search inputs, and deletion workflows protected by self-deletion safeguards.
- **[MODIFY] Tenant List View (`TenantListPage.tsx`)** ([TenantListPage.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/views/TenantListPage.tsx)):
  - Completely refactored to utilize the newly created shared visual registry components, eliminating over 250 lines of duplicate UI layout structure.
  - Migrated service tier and status indicators to use the evolved generic atomic `Badge` component, ensuring typography and roundness consistency.
- **[MODIFY] Users Collection Configuration (`index.ts`)** ([Users/index.ts](file:///home/itlight/dev/hermes-cms/apps/cms/src/collections/Users/index.ts)):
  - Registered `UserListPage` custom React component inside `admin.components.views.list` to substitute default list grids.
- **[MODIFY] Global Stylesheet (`globals.css`)** ([globals.css](file:///home/itlight/dev/hermes-cms/apps/cms/src/app/globals.css)):
  - Added modern Alexandria text stagger animations utilizing keyframe-based soft-blur blur scales (`.animate-soft-blur-in`).
- **[MODIFY] Tenant Creation/Edit Wizard (`CreateTenantPage.tsx`)** ([CreateTenantPage.tsx](file:///home/itlight/dev/hermes-cms/apps/cms/src/components/views/CreateTenantPage.tsx)):
  - Integrated interactive step navigation (Identity -> Domains -> White-Labeling).
  - Added live domain-limit meters, real-time slug format validation, and high-fidelity, real-time branded sidebar preview cards.
- **[MODIFY] Global Custom Layout Reset (`globals.css`)** ([globals.css](file:///home/itlight/dev/hermes-cms/apps/cms/src/app/globals.css)):
  - Registered `.custom-tenant-view` and `.custom-user-view` layout reset styles using modern CSS `:has()` relational selectors. Hides redundant Payload CMS headers, gutters, title cards, and navigation controls cleanly, ensuring our bespoke Alexandria editorial dashboards render perfectly with the proper `18rem` sidebar offset.

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
