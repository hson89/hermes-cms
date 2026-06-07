# Data Model: Template Deployments

This feature utilizes the existing `template-deployments` collection.

## Entity: TemplateDeployment

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `template` | relationship | Reference to `page-templates` |
| `site` | relationship | Reference to `hosted-sites` |
| `triggeredBy` | relationship | Reference to `users` |
| `status` | select | 'pending', 'success', 'failed' |
| `payload` | json | Deployment configuration payload |
| `tenant` | relationship | Reference to `tenants` (multi-tenant scope) |
| `createdAt` | date | Deployment timestamp |
| `updatedAt` | date | Last status update |

## Access Control
- Read: `tenantAccess` (Must be a member of the tenant)
- Create: `tenantAccess`
- Update: `tenantAccess`
- Delete: `tenantAccess`
