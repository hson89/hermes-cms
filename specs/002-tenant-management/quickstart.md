# Quickstart: Tenant Onboarding

Follow these steps to onboard a new tenant into Hermes AI.

## Prerequisites
- You must be logged in as a **Super Admin**.
- You must have the tenant's primary domain ready.

## Steps

### 1. Create the Tenant
1. Navigate to **Tenant Management** in the Admin Sidebar.
2. Click **Create New**.
3. Fill in the **Name** (e.g., "Acme Corp") and **Slug** ("acme").
4. Set **Status** to `active`.
5. Add a new row to **Domains**:
   - Hostname: `acme.hermes-cms.com`
   - Is Primary: Checked
6. Click **Save**.

### 2. Configure Branding
1. Scroll to the **Branding** section.
2. Upload a **Logo**.
3. Select a **Primary Color**.
4. Click **Save**.

### 3. Verify Access
1. Open a new browser tab and navigate to `http://acme.hermes-cms.com:3000/admin`.
2. You should see the custom logo and branding on the login page.
3. Attempting to access `http://acme.hermes-cms.com:3000/api/content-items` should return data scoped only to Acme Corp.

## Troubleshooting
- **Domain not resolving**: Check `AuditLogs` for `tenant_resolution_failure` entries.
- **Access Blocked**: Verify the tenant status is `active` and not `suspended`.
