# Contract: Schema Generation API

This API is used internally between the CMS Monolith and the FastAPI AI Agent Microservice to handle AI-assisted content schema modeling.

## Endpoint: POST /api/ai/generate-schema

Sends a natural language prompt to the AI service to parse and generate a structured content type schema.

### Authentication
- `X-Internal-Secret`: Internal service-to-service auth header (matching CMS environment config).

### Request Payload (JSON)
```json
{
  "prompt": "Create a luxury car inventory with model name, price, year, and image upload",
  "tenant_id": "8f3079b7-0b5c-43f6-8c44-e39537f763bd",
  "user_id": "2d1a3f6a-4d7a-4293-8b7a-62bb8c09a89d"
}
```

### Success Response (202 Accepted)
```json
{
  "session_id": "c1356ef2-4ab9-42b7-8ce6-d1839c4e1a0b",
  "status": "processing"
}
```

### Error Responses

#### 422 Unprocessable Entity
Returned if the prompt is empty or payload fields are malformed.
```json
{
  "detail": [
    {
      "loc": ["body", "prompt"],
      "msg": "prompt must not be empty.",
      "type": "value_error"
    }
  ]
}
```

#### 503 Service Unavailable
Returned if the AI service fails to contact the LLM or if self-correction retries exceed the limit.
```json
{
  "detail": "Schema generation failed after 3 retries due to malformed output."
}
```

---

## Endpoint: GET /api/ai/sessions/{session_id}

Retrieves the execution status, message counts, and generated schema (when completed) for a schema generation session.

### Success Response (200 OK)
```json
{
  "id": "c1356ef2-4ab9-42b7-8ce6-d1839c4e1a0b",
  "status": "completed",
  "tenant_id": "8f3079b7-0b5c-43f6-8c44-e39537f763bd",
  "user_id": "2d1a3f6a-4d7a-4293-8b7a-62bb8c09a89d",
  "message_count": 3,
  "created_at": "2026-05-17T09:33:43.000Z",
  "updated_at": "2026-05-17T09:33:55.000Z",
  "content_schema": {
    "name": "Luxury Car Inventory",
    "fields": [
      {
        "name": "modelName",
        "type": "text",
        "required": true,
        "label": "Model Name",
        "description": "The name or model of the car"
      },
      {
        "name": "price",
        "type": "number",
        "required": true,
        "label": "Price",
        "description": "Retail price in USD"
      },
      {
        "name": "year",
        "type": "number",
        "required": true,
        "label": "Year",
        "description": "Year of manufacture"
      },
      {
        "name": "image",
        "type": "upload",
        "required": false,
        "label": "Car Image",
        "description": "Branded image of the vehicle"
      }
    ]
  }
}
```
