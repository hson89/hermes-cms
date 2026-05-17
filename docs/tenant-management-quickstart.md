# Tenant Management Quickstart

This guide explains how to manage tenants and domains in Hermes AI.

## 1. Creating a Tenant
1. Log in as a **Super Admin**.
2. Navigate to **Identity > Tenants**.
3. Click **Create New**.
4. Fill in:
   - **Name**: Client Name (e.g., Acme Corp)
   - **Slug**: Unique identifier (e.g., acme)
   - **Primary Domain**: The main branded domain (e.g., cms.acme.com)
   - **Tier**: Standard, Premium, or Enterprise.
5. Save the tenant.

## 2. Configuring Custom Domains
1. In the Tenant record, find the **Domains** section.
2. Add your custom hostnames.
3. The system will enforce limits based on the tier:
   - **Standard**: 10 domains
   - **Premium**: 50 domains
   - **Enterprise**: Unlimited

## 3. Branding
- **Logo**: Upload a logo in the Branding section.
- **Primary Color**: Set a hex color (e.g., #094cb2) to customize the workspace.

## 4. Tenant Status
- **Active**: Normal operations.
- **Suspended**: Access is blocked for all users of this tenant.
- **Archived**: Soft-deleted state. Data is preserved but hidden from public APIs.

## 5. Impersonation (Super Admin Only)
Super Admins can access any tenant's data. All impersonated actions are logged in the **System > Audit Logs** collection.

## 6. Resolution API
Internal services can resolve tenants via:
`GET /api/tenants/resolve?hostname=...`
Requires `X-Internal-Secret` header.
