# Data Model: Define Content Types

## Collections

### ContentTypes (updated)
Represents a dynamic content schema definition scoped to a tenant.

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `name` | text | Yes | No | Human-readable name of the content type. |
| `slug` | text | Yes | Yes (tenant) | URL-safe identifier (e.g. `car-inventory`), unique per tenant. |
| `status` | select | Yes | No | Lifecycle stage: `draft` or `published`. Default: `draft`. |
| `schema` | json | Yes | No | Detailed JSON schema representing fields, labels, types, and validations. |
| `generatedByAI` | checkbox | Yes | No | Flag indicating if this was suggested by the AI agent. |
| `aiSessionId` | text | No | No | Reference to the `AIAgentSession` that generated the schema (if AI-assisted). |

**Dynamic JSON Schema Structure (`schema`)**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ContentTypeSchema",
  "type": "object",
  "properties": {
    "fields": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "pattern": "^[a-zA-Z0-9_-]+$" },
          "label": { "type": "string" },
          "type": { "type": "string", "enum": ["text", "number", "boolean", "date", "richText", "json", "relationship", "select", "upload", "array", "blocks"] },
          "required": { "type": "boolean" },
          "unique": { "type": "boolean" },
          "localized": { "type": "boolean" },
          "options": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "label": { "type": "string" },
                "value": { "type": "string" }
              },
              "required": ["label", "value"]
            }
          },
          "relationTo": { "type": "string" },
          "fields": { "type": "array" } // For recursive arrays or nested blocks
        },
        "required": ["name", "label", "type"]
      }
    }
  },
  "required": ["fields"]
}
```

---

### ContentItems (updated)
Represents a content entry instantiated from a specific dynamic `ContentType`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | text | Yes | Display title for the content entry. |
| `contentType` | relationship | Yes | Reference to the `ContentTypes` collection. |
| `fieldsData` | json | Yes | Structured JSON object holding the actual values for the dynamic fields (e.g. `{"price": 10000}`). |
| `status` | select | Yes | Publishing state: `draft` or `published`. Default: `draft`. |
| `tenant` | relationship | Yes | Reference to `Tenants` (handled by the multi-tenant plugin). |

**Access Control & Hooks**:
- `beforeValidate`: Hook parses `contentType` schema and validates `fieldsData` recursively (checks types, required properties, and unique constraints).
- `beforeChange`: Hook prevents updates if `status === 'published'` and schema has changed destructively.

---

### AIAgentSession (AI service, port 5433)
Tracks conversation logs for schema generation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Session ID generated on the backend. |
| `tenant_id` | uuid | Yes | Reference to the tenant scope. |
| `user_id` | uuid | Yes | Reference to the user scope. |
| `context` | jsonb | Yes | List of conversation messages containing roles (`system`, `user`, `assistant`) and raw LLM text. |
| `status` | text | Yes | Current status: `active`, `completed`, `failed`. |
| `created_at` | datetime | Yes | Timestamp of creation. |
| `updated_at` | datetime | Yes | Timestamp of last message or state transition. |

## Relationships
- `ContentTypes` belongs to a `Tenant` (logical 1-to-many).
- `ContentItems` references a `ContentType` (many-to-1) and belongs to a `Tenant` (logical 1-to-many).
- `AIAgentSession` belongs to a `Tenant` and a `User` in the AI service metadata store.
