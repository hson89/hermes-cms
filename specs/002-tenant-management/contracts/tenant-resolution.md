# Contract: Tenant Resolution API

This internal API is used by the delivery layer and the AI service to identify the active tenant context based on the incoming request hostname.

## Endpoint: GET /api/tenants/resolve

### Request Headers
- `X-Internal-Secret`: Mandatory for inter-service authentication.

### Query Parameters
- `hostname`: The hostname to resolve (e.g., `client-a.hermes-cms.com`).

### Success Response (200 OK)
```json
{
  "id": "tenant_uuid_123",
  "slug": "client-a",
  "status": "active",
  "branding": {
    "primaryColor": "#094cb2",
    "logoUrl": "https://..."
  }
}
```

### Error Responses

#### 404 Not Found
Returned if the hostname is not mapped to any active tenant.
```json
{
  "error": "Tenant not found",
  "code": "TENANT_NOT_RESOLVED"
}
```

#### 403 Forbidden
Returned if the tenant is `suspended` or `archived`.
```json
{
  "error": "Tenant access blocked",
  "code": "TENANT_BLOCKED",
  "status": "suspended"
}
```

#### 401 Unauthorized
Returned if `X-Internal-Secret` is missing or invalid.
```json
{
  "error": "Internal authentication failed"
}
```
