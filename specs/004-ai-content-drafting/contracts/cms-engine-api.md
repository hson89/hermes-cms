# API Contracts: CMS Engine — Drafting Proxy & Session Management

**Feature**: 004-ai-content-drafting  
**Service**: Content Management Engine (Next.js/Payload, port 3000)  
**Auth**: Payload session cookie (browser → CMS Engine)

> **⚠️ Route Placement**: All routes below are implemented under `src/app/api/` (standard Next.js API directory), **NOT** under `src/app/(payload)/api/`, to avoid conflicts with Payload's `[...slug]` catch-all route. See R-012 in `research.md`.

## POST /api/ai/draft

**Purpose**: CMS proxy endpoint. Validates Payload auth, enforces rate limiting, acquires session lock, then proxies to the Content Authoring Service's `/api/ai/draft` endpoint as an SSE relay.

### Request

```http
POST /api/ai/draft HTTP/1.1
Content-Type: application/json
Cookie: payload-token=<session-cookie>
```

```json
{
  "prompt": "Write an article about the future of quantum computing",
  "contentTypeId": "ct-789",
  "draftingSessionId": "ds-001",
  "styleModifierId": "sm-123",
  "locale": "en",
  "modelOverride": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | yes | User's natural language instruction |
| `contentTypeId` | string | yes | ContentType document ID |
| `draftingSessionId` | string | yes | Active DraftingSession ID |
| `styleModifierId` | string | null | no | StyleModifier document ID to load |
| `locale` | string | no | Target locale (default: `en`) |
| `modelOverride` | string | null | no | LLM model override |

### Response (SSE Stream — Proxied)

Same event types as Content Authoring Service (see `content-authoring-api.md`).

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid or missing Payload session |
| 403 | `FORBIDDEN` | User lacks content creation permission |
| 404 | `NOT_FOUND` | ContentType or DraftingSession not found |
| 409 | `SESSION_LOCKED` | Another user has an active session for this schema |
| 429 | `RATE_LIMITED` | Exceeded 10 requests/minute |

---

## POST /api/ai/refine

**Purpose**: CMS proxy for stateless inline text refinement. Rate-limited.

### Request

```http
POST /api/ai/refine HTTP/1.1
Content-Type: application/json
Cookie: payload-token=<session-cookie>
```

```json
{
  "text": "The selected paragraph text...",
  "instruction": "simplify",
  "draftingSessionId": "ds-001",
  "styleModifierId": null,
  "locale": "en",
  "modelOverride": null
}
```

### Response (SSE Stream — Proxied)

Same event types as Content Authoring Service refine endpoint.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid session |
| 429 | `RATE_LIMITED` | Exceeded 10 requests/minute |

---

## POST /api/drafting-sessions

**Purpose**: Create a new DraftingSession, acquiring the single-user lock.

### Request

```http
POST /api/drafting-sessions HTTP/1.1
Content-Type: application/json
Cookie: payload-token=<session-cookie>
```

```json
{
  "contentType": "ct-789",
  "locale": "en",
  "selectedModel": null
}
```

### Response

```json
{
  "doc": {
    "id": "ds-001",
    "tenant": "abc-123",
    "user": "user-456",
    "contentType": "ct-789",
    "status": "active",
    "draftData": {},
    "versions": [],
    "activeLocale": "en",
    "selectedModel": null,
    "lockedAt": "2026-05-18T22:00:00Z",
    "lastActivityAt": "2026-05-18T22:00:00Z",
    "createdAt": "2026-05-18T22:00:00Z",
    "updatedAt": "2026-05-18T22:00:00Z"
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid session |
| 409 | `SESSION_LOCKED` | Active session exists for this contentType + tenant |

---

## PATCH /api/drafting-sessions/:id

**Purpose**: Auto-save field updates and version snapshots.

### Request

```http
PATCH /api/drafting-sessions/ds-001 HTTP/1.1
Content-Type: application/json
Cookie: payload-token=<session-cookie>
```

```json
{
  "draftData": {
    "title": "The Quantum Leap",
    "slug": "the-quantum-leap",
    "body": { "root": { "children": [...] } }
  },
  "createSnapshot": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `draftData` | object | no | Partial or full draft field values |
| `createSnapshot` | boolean | no | If true, push current state to versions array |

### Response

```json
{
  "doc": {
    "id": "ds-001",
    "lastActivityAt": "2026-05-18T22:05:30Z",
    "updatedAt": "2026-05-18T22:05:30Z"
  }
}
```

---

## DELETE /api/drafting-sessions/:id/lock

**Purpose**: Proactively release the session lock (called on user exit/tab close).

### Request

```http
DELETE /api/drafting-sessions/ds-001/lock HTTP/1.1
Cookie: payload-token=<session-cookie>
```

### Response

```json
{ "released": true }
```

---

## POST /api/drafting-sessions/:id/promote

**Purpose**: Promote draft to ContentItem and atomically delete the DraftingSession.

> **⚠️ Transaction Safety (FR-010)**: This endpoint MUST wrap `payload.create()` (ContentItem) and `payload.delete()` (DraftingSession) in a single Postgres transaction using Payload's `req.transactionID`. If the ContentItem creation succeeds but the session deletion fails (e.g., DB connection drop), the transaction rolls back entirely, preventing "ghost" sessions that reference published content. Implementation: Use `await payload.db.beginTransaction()` to obtain a `transactionID`, pass it to both operations, then `commitTransaction()` on success or `rollbackTransaction()` on failure.

### Request

```http
POST /api/drafting-sessions/ds-001/promote HTTP/1.1
Content-Type: application/json
Cookie: payload-token=<session-cookie>
```

```json
{
  "action": "save" | "publish"
}
```

### Response

```json
{
  "contentItem": {
    "id": "ci-999",
    "status": "draft" | "published"
  },
  "sessionDeleted": true
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid session |
| 404 | `NOT_FOUND` | DraftingSession not found |
| 409 | `INVALID_STATE` | Session is not in `active` status |

---

## POST /api/ai/download-image

**Purpose**: Download an AI-generated image from a temporary URL and persist it to the Payload Media collection using a **streaming pipeline** (no memory buffering).

> **Implementation Note**: The download MUST use `Readable.fromWeb(response.body)` to pipe the fetch stream directly into Payload's Media `create()` call, avoiding buffering large image binaries in Node.js process memory. This prevents OOM errors under concurrent load.

### Request

```http
POST /api/ai/download-image HTTP/1.1
Content-Type: application/json
Cookie: payload-token=<session-cookie>
```

```json
{
  "url": "https://provider.com/temp/img-abc123.png",
  "alt_text": "Quantum computing chip",
  "draftingSessionId": "ds-001"
}
```

### Response

```json
{
  "media": {
    "id": "media-789",
    "url": "/media/quantum-computing-chip.png",
    "filename": "quantum-computing-chip.png"
  }
}
```
