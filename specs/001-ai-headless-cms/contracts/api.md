# Content Delivery API Contract

## Base URL
`GET /api/v1/delivery/`

## Authentication
Requires `Authorization: Bearer <APIKey>` header.

## Endpoints

### Get Content Items by Type
`GET /content/{content_type_name}`

**Query Parameters**:
- `limit`: Integer (default: 10)
- `offset`: Integer (default: 0)
- `status`: String (default: "Published")

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "data": {
        "title": "Example Post",
        "body": {
          "blocks": [
            { "type": "paragraph", "data": { "text": "Hello world" } }
          ]
        }
      },
      "published_at": "2026-05-09T00:00:00Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```