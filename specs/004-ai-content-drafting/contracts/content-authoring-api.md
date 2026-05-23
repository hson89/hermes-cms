# API Contracts: Content Authoring Service — Content Drafting

**Feature**: 004-ai-content-drafting  
**Service**: Content Authoring Service (FastAPI, port 8000)  
**Auth**: `X-Internal-Secret` header (CMS Engine → AI Service)

---

## POST /api/ai/draft

**Purpose**: Initiate a full content draft generation based on a schema and user prompt. Returns an SSE stream of field-level content.

### Request

```http
POST /api/ai/draft HTTP/1.1
Content-Type: application/json
X-Internal-Secret: <secret>
```

```json
{
  "prompt": "Write an article about the future of quantum computing",
  "tenant_id": "abc-123",
  "user_id": "user-456",
  "schema": {
    "name": "Tech Blog Post",
    "fields": [
      { "name": "title", "type": "text", "required": true },
      { "name": "slug", "type": "text", "required": true },
      { "name": "body", "type": "richText", "required": true },
      { "name": "mainMedia", "type": "upload", "required": false }
    ]
  },
  "style_modifier": "Write in a technical, data-driven tone with precise language.",
  "locale": "en",
  "model_override": null,
  "session_context": []
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | yes | Natural language instruction for content generation |
| `tenant_id` | string | yes | Tenant ID for isolation |
| `user_id` | string | yes | Requesting user ID |
| `schema` | object | yes | ContentType schema definition with fields |
| `style_modifier` | string | null | no | System prompt for tone/style (from StyleModifier) |
| `locale` | string | no | Target locale (default: `en`) |
| `model_override` | string \| null | no | LLM model override (null = tenant default) |
| `session_context` | array | no | Previous conversation messages for continuity |

> **Locale Injection (FR-018)**: When `locale` is provided, the service MUST inject a strict locale constraint into the LLM system prompt: _"CRITICAL: You MUST generate ALL content strictly in the following language/locale: {locale}."_

> **Dynamic Model Routing (FR-017)**: When `model_override` is non-null, the service MUST use `init_chat_model(model=model_override, ...)` for this request only, falling back to the tenant's default model configuration if null.

### Response (SSE Stream)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

#### Event Types

**`FIELD_START`** — A field is beginning generation.
```
event: FIELD_START
data: {"field": "title", "type": "text"}
```

**`TEXT_DELTA`** — Incremental text chunk for the current field.
```
event: TEXT_DELTA
data: {"field": "title", "delta": "The Quantum Leap: How"}
```

**`FIELD_COMPLETE`** — A field has finished generating.
```
event: FIELD_COMPLETE
data: {"field": "title", "value": "The Quantum Leap: How Quantum Computing Will Transform 2026", "type": "text"}
```

**`IMAGE_READY`** — Image generation completed (for upload fields).
```
event: IMAGE_READY
data: {"field": "mainMedia", "url": "https://provider.com/temp/img-abc.png", "alt_text": "Quantum computing abstract visualization", "prompt_used": "..."}
```

**`SCHEMA_UPDATED`** — Schema was created or modified via a `schema_resolver` tool call (FR-002). The frontend MUST refetch the schema and re-render the Structured Editor panel before processing subsequent `FIELD_START`/`TEXT_DELTA` events.
```
event: SCHEMA_UPDATED
data: {"schema_id": "ct-789", "schema_name": "Tech Blog Post", "fields": [{"name": "title", "type": "text", "required": true}, {"name": "slug", "type": "text", "required": true}, {"name": "body", "type": "richText", "required": true}], "action": "created" | "modified"}
```

**`STATUS_UPDATE`** — Session status change.
```
event: STATUS_UPDATE
data: {"status": "generating" | "paused" | "completed" | "failed"}
```

**`TOKEN_USAGE`** — Token consumption for audit logging. Note: `estimated_cost` MUST be measured strictly in USD microdollars ($1 = 1,000,000 microdollars) to ensure billing calculations scale accurately.
```
event: TOKEN_USAGE
data: {"prompt_tokens": 450, "completion_tokens": 1200, "total_tokens": 1650, "estimated_cost": 3300, "model": "gpt-4o", "provider": "openai", "duration_ms": 3200}
```

**`ERROR`** — Error event.
```
event: ERROR
data: {"code": "GENERATION_FAILED", "message": "LLM invocation timed out", "field": "body"}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid `X-Internal-Secret` |
| 422 | `VALIDATION_ERROR` | Invalid request body (missing required fields) |
| 503 | `SERVICE_UNAVAILABLE` | LLM provider unavailable |

---

## POST /api/ai/refine

**Purpose**: Stateless refinement of a specific text segment (Simplify, Expand, Change Tone). Does NOT maintain session state.

### Request

```http
POST /api/ai/refine HTTP/1.1
Content-Type: application/json
X-Internal-Secret: <secret>
```

```json
{
  "text": "Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to process information in fundamentally new ways.",
  "instruction": "simplify",
  "tenant_id": "abc-123",
  "user_id": "user-456",
  "style_modifier": null,
  "locale": "en",
  "model_override": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | yes | The text segment to refine |
| `instruction` | string | yes | Refinement action: `simplify`, `expand`, `change_tone`, or free-text |
| `tenant_id` | string | yes | Tenant ID |
| `user_id` | string | yes | User ID |
| `style_modifier` | string | null | no | Tone modifier prompt |
| `locale` | string | no | Target locale (default: `en`) |
| `model_override` | string \| null | no | LLM model override |

> **Locale Injection**: Same locale constraint injection as `/api/ai/draft` (see above).

> **Model Routing**: Same dynamic `init_chat_model` routing as `/api/ai/draft`.

### Response (SSE Stream)

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
```

```
event: TEXT_DELTA
data: {"delta": "Quantum computing uses special physics "}

event: TEXT_DELTA
data: {"delta": "to solve problems faster than regular computers."}

event: REFINE_COMPLETE
data: {"text": "Quantum computing uses special physics to solve problems faster than regular computers.", "instruction": "simplify"}

event: TOKEN_USAGE
data: {"prompt_tokens": 85, "completion_tokens": 25, "total_tokens": 110, "estimated_cost": 220, "model": "gpt-4o", "provider": "openai", "duration_ms": 800}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid secret |
| 422 | `VALIDATION_ERROR` | Empty text or instruction |
| 503 | `SERVICE_UNAVAILABLE` | LLM unavailable |

---

## POST /api/ai/generate-image

**Purpose**: Generate an image based on content context, returning a temporary URL for the CMS Engine to download and persist.

### Request

```http
POST /api/ai/generate-image HTTP/1.1
Content-Type: application/json
X-Internal-Secret: <secret>
```

```json
{
  "prompt": "A futuristic quantum computing chip glowing with blue light, abstract editorial style",
  "tenant_id": "abc-123",
  "user_id": "user-456",
  "aspect_ratio": "16:9",
  "style": "editorial"
}
```

### Response

```json
{
  "url": "https://provider.com/temp/img-abc123.png",
  "alt_text": "Futuristic quantum computing chip",
  "width": 1920,
  "height": 1080,
  "prompt_used": "A futuristic quantum computing chip...",
  "token_usage": {
    "prompt_tokens": 50,
    "completion_tokens": 0,
    "total_tokens": 50,
    "estimated_cost": 40000,
    "model": "dall-e-3",
    "provider": "openai",
    "duration_ms": 8500
  }
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid secret |
| 422 | `CONTENT_POLICY` | Image prompt violates content policy |
| 503 | `SERVICE_UNAVAILABLE` | Image generation provider unavailable |
