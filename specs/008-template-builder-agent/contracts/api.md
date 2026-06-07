# API Contract: Template Builder Agent

This document defines the HTTP endpoints exposed by the Content Authoring Service for the Template Builder Agent.

## Endpoints

### 1. POST /api/ai/template-builder/generate

Accepts a raw HTML design and coordinates schema and template creation in Payload CMS.

* **Headers**:
  * `Content-Type: application/json`
  * `X-Internal-Secret: <INTERNAL_SERVICE_SECRET>`
* **Request Body**:
  ```json
  {
    "html_design": "string (required, raw HTML content)",
    "tenant_id": "string (required, tenant ID)",
    "user_id": "string (required, user ID)",
    "session_id": "string (optional, session ID)"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "status": "completed",
    "session_id": "string",
    "content_type": {
      "id": "string",
      "name": "string",
      "slug": "string",
      "schema": {
        "name": "string",
        "fields": [...]
      }
    },
    "page_template": {
      "id": "string",
      "name": "string",
      "slug": "string",
      "htmlContent": "string",
      "layout": [...]
    },
    "explanation": "string"
  }
  ```
* **Response (422 Unprocessable Entity)**:
  Returned when input parameters fail validation.
  ```json
  {
    "detail": "string (error description)"
  }
  ```
* **Response (401 Unauthorized)**:
  Returned when the `X-Internal-Secret` header is missing or incorrect.

## MCP Tool Interface

### Tool: `convert_html_to_template`

Exposed by FastMCP for stdio and SSE transport.

* **Arguments**:
  * `html_design`: `string` (required, raw HTML design code to parse)
  * `session_id`: `string` (optional, conversation session identifier)
* **Response**:
  * A markdown text response containing a summary of the registered template and schema.
  * An A2UI Card layout rendering the list of created fields and template slugs.
