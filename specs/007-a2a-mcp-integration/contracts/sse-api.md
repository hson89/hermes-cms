# Contract: SSE MCP Transport API

This contract specifies the Server-Sent Events (SSE) transport endpoints implemented in the `content-authoring-service` for cloud-based MCP clients.

## Authentication Rules

To support various API clients, the service accepts the tenant API key in two formats:
1. **Custom Header**: `X-API-Key: <hermes-tenant-api-key>`
2. **Standard Header**: `Authorization: Bearer <hermes-tenant-api-key>`

Both methods pass the raw Hermes tenant API key directly. The FastAPI microservice validates this token via an internal synchronous REST request to Next.js Content Management Engine's `/api/api-keys/validate` endpoint using the `X-Internal-Secret` security header.

---

## 1. Connection Establishment (SSE Endpoint)

Establishes the Server-Sent Events stream from the client to the server.

### Request

- **Method**: `GET`
- **Path**: `/api/v1/mcp/sse`
- **Headers**:
  - `X-API-Key`: `<hermes-tenant-api-key>` OR `Authorization: Bearer <hermes-tenant-api-key>`
- **Query Parameters**:
  - `client_metadata`: (Optional) URL-encoded client identity string.

### Response

- **Status**: `200 OK`
- **Headers**:
  - `Content-Type`: `text/event-stream`
  - `Cache-Control`: `no-cache`
  - `Connection`: `keep-alive`

### Stream Events

#### Event: `endpoint`
Emitted immediately upon successful connection. Tells the client where to send JSON-RPC client messages (since SSE is a one-way downstream-only transport).

```text
event: endpoint
data: /api/v1/mcp/message?session_id=sse-session-abcd-1234
```

---

## 2. JSON-RPC Client Messaging Endpoint

Receives client JSON-RPC request messages (e.g. tool listings, tool executions).

### Request

- **Method**: `POST`
- **Path**: `/api/v1/mcp/message`
- **Query Parameters**:
  - `session_id`: (Required) String UUID matching the established SSE session.
- **Headers**:
  - `Content-Type`: `application/json`
  - `X-API-Key`: `<hermes-tenant-api-key>` OR `Authorization: Bearer <hermes-tenant-api-key>`
- **Body**: Standard MCP JSON-RPC 2.0 Request Object.

#### Example: Execute Tool Request
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "draft_content",
    "arguments": {
      "prompt": "Create a blog post about Alexandria design system.",
      "content_type_slug": "posts"
    }
  },
  "id": 1
}
```

### Response

- **Status**: `200 OK` (Or appropriate HTTP error status if session invalid)
- **Body**: Standard JSON response acknowledging receipt, or standard MCP error. The actual tool response content is streamed back through the established SSE channel matching the request's ID.

#### Example Response Body
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "accepted"
  },
  "id": 1
}
```

---

## 3. SSE Stream Downstream Events

Subsequent JSON-RPC responses, updates, and stream chunks are sent over the open SSE stream established in Section 1.

#### Event: `message`
```text
event: message
data: {"jsonrpc": "2.0", "result": {"content": [{"type": "text", "text": "Draft content successfully completed."}]}, "id": 1}
```
