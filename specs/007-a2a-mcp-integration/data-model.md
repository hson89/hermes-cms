# Data Model: A2A, MCP & A2UI Integration

This document defines the data structures and formats used for managing sessions, connections, tool definitions, and visual A2UI layouts within the Hermes CMS integration.

---

## 1. External Connection & Session Context

Sessions initiated by external AI clients are tracked ephemerally within the authoring service. Stdio connections are bound to the lifetime of the process, while SSE connections are matched to a `session_id`.

### Ephemeral Session Registry

Managed in memory in the FastAPI service (`apps/content-authoring-service`):

```python
class MCPSessionContext:
    session_id: str             # Unique connection ID
    tenant_id: str              # Isolated Tenant ID retrieved via validation
    client_metadata: dict       # Client identity info (e.g. "Claude Desktop", "ChatGPT")
    created_at: datetime
    last_active: datetime
```

---

## 2. API Key Validation Contract (Next.js ↔ FastAPI)

Synchronous internal REST exchange between Python and Payload CMS.

### Validation Request

**POST** `/api/api-keys/validate`

Headers:
- `X-Internal-Secret`: `<hermes-internal-secret>`
- `Content-Type`: `application/json`

Body:
```json
{
  "apiKey": "string"
}
```

### Validation Response (Success)

Status: `200 OK`
```json
{
  "valid": true,
  "apiKey": {
    "id": "64b1f6...",
    "label": "Claude Desktop Integration",
    "email": "editor@tenant.com",
    "tenant": "64b1e5a..."  // Tenant ID string
  }
}
```

### Validation Response (Failure)

Status: `401 Unauthorized`
```json
{
  "valid": false,
  "error": "Invalid API Key or expired."
}
```

---

## 3. A2UI / AGUI Component Schema

Lightweight, JSON-serializable structure used to construct interfaces returned from agent actions.

### Schema Spec (Alexandria Component)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "A2UIComponent",
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": ["card", "table", "chart", "form", "container"]
    },
    "theme": {
      "type": "string",
      "enum": ["primary", "success", "danger", "gold", "neutral"]
    },
    "typography": {
      "type": "string",
      "enum": ["serif", "sans"]
    },
    "elevation": {
      "type": "string",
      "enum": ["flat", "raised", "glass"]
    },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "data": { "type": "object" },
    "actions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "label": { "type": "string" },
          "action": { "type": "string" },
          "payload": { "type": "object" }
        },
        "required": ["label", "action"]
      }
    },
    "children": {
      "type": "array",
      "items": { "$ref": "#" }
    }
  },
  "required": ["type", "theme", "typography"]
}
```

#### Example: Alexandria Styled Metric Card

```json
{
  "type": "card",
  "theme": "primary",
  "typography": "serif",
  "elevation": "glass",
  "title": "Draft Summary",
  "description": "Content Draft for 'Alexandria Design System History'",
  "data": {
    "sections": 3,
    "words": 420,
    "status": "draft"
  },
  "actions": [
    {
      "label": "Publish to CMS",
      "action": "publish_draft",
      "payload": {
        "content_item_id": "item_12345"
      }
    }
  ]
}
```
