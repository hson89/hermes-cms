# Data Model: Tenant Management

## Collections

### Tenants
Represents an isolated organizational unit or client.

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `name` | text | Yes | No | Display name of the tenant. |
| `slug` | text | Yes | Yes | URL-safe identifier. |
| `status` | select | Yes | No | `active`, `suspended`, `archived`. |
| `domains` | array | Yes | No | List of mapped hostnames. |
| `domains.hostname` | text | Yes | Yes | The actual domain/subdomain string. |
| `domains.isPrimary` | checkbox | No | No | Marks the primary domain for branding. |
| `branding.logo` | upload | No | No | Workspace logo (links to `media`). |
| `branding.primaryColor` | text | No | No | Hex code for tenant-specific UI. |

**Access Control**:
- `read`: Super Admins can read all. Tenant users can only read their own tenant.
- `create/update/delete`: Super Admin only.

---

### AuditLogs
Centralized log for security and operational events.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | text | Yes | E.g., `tenant_resolution_failure`, `impersonation_start`. |
| `severity` | select | Yes | `info`, `warning`, `error`. |
| `tenant` | relationship | No | Reference to `Tenants` (if applicable). |
| `user` | relationship | No | Reference to `Users` who performed the action. |
| `metadata` | json | No | Extra context (IP, hostname, etc.). |
| `isImpersonated` | checkbox | No | True if action was performed via impersonation. |

**Access Control**:
- `read`: Super Admin only.
- `create`: System only (no public access).
- `update/delete`: Disabled.

## Relationships
- `Tenant` -> `Users`: One-to-many (via `tenant` field in `Users`).
- `Tenant` -> `ContentItems`: One-to-many (enforced by multi-tenant plugin).
- `Tenant` -> `ContentTypes`: One-to-many.
