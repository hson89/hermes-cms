# Research: Tenant Management

## Decision 1: Domain Mapping Strategy
- **Decision**: Implement a `domains` array field directly within the `Tenants` collection.
- **Rationale**: Payload's multi-tenant plugin can easily be configured to resolve tenants based on a field. Storing it in an array allows for multiple domains per tenant (FR-002) and simplifies the "Primary Domain" logic (FR-014).
- **Alternatives considered**: Separate `DomainMapping` collection. Rejected because it adds overhead for simple hostname lookups and complicates the multi-tenant plugin configuration which expects a direct link to the tenant.

## Decision 2: Soft Delete & Archiving
- **Decision**: Use a `status` select field in `Tenants` with values `['active', 'suspended', 'archived']`.
- **Rationale**: Meets FR-004 and FR-009. Access control rules in Payload can be easily updated to check this `status` field and deny access if not `active`.
- **Implementation**: Update `access` rules in `Tenants` and all tenant-aware collections to filter out `archived` or `suspended` tenants for non-super-admins.

## Decision 3: Audit Logging
- **Decision**: Create a new `AuditLogs` collection in `apps/content-management-engine`.
- **Rationale**: Centralized store for resolution failures (FR-008) and impersonation logs (FR-010).
- **Metadata**: Include `ip`, `hostname`, `tenantId`, `userId`, `action`, `severity`, and `timestamp`.

## Decision 4: Tenant Resolution API
- **Decision**: Implement a custom Express/Next.js middleware or a Payload `globals` hook that performs a hostname lookup.
- **Rationale**: FR-007 requires resolving tenant ID from hostname. This needs to be extremely fast. A cached lookup in PostgreSQL or a simple indexed query on the `domains` field in `Tenants` is sufficient for the initial scale.

## Decision 5: Super Admin Impersonation
- **Decision**: Leverage Payload's `overrideAccess` and custom session handling.
- **Rationale**: Allows Super Admins to bypass standard ACLs. A custom UI component in the Admin panel will allow selecting a tenant to "view as".
- **Logging**: Every request made during impersonation must be logged to `AuditLogs` with a `isImpersonated: true` flag.

## Needs Clarification (Resolved)
- **Performance Goals**: API tenant resolution should be < 50ms.
- **Domain Limits**: Enforce a default limit of 10 domains per tenant using a custom field validation.
