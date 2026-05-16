# API Contracts

## Content Delivery API (Read-only)

Provided natively by Payload CMS via REST and GraphQL.

### `GET /api/content-items?where[tenant][equals]=<TenantId>&where[contentType][equals]=<TypeId>`
Retrieves published content items of a specific type.
**Headers**: 
- `Authorization: <APIKey or JWT>`
**Response**:
```json
{
  "docs": [
    {
      "id": "uuid",
      "title": "Example Title",
      "content": [ { "blockType": "text", "text": "..." } ],
      "updatedAt": "2026-05-09T00:00:00Z"
    }
  ],
  "totalDocs": 1,
  "limit": 10,
  "totalPages": 1,
  "page": 1
}
```

## Management API (Internal/Editor Custom Endpoints)

Payload CMS allows defining custom endpoints.

### `POST /api/ai/generate-schema`
Generates a ContentType schema from natural language.
**Headers**:
- `Authorization: JWT <UserToken>`
**Payload**:
```json
{
  "prompt": "Create a blog post schema about technology"
}
```

### `POST /api/ai/copilot/edit`
Applies an AI edit to a specific section of content.
**Payload**:
```json
{
  "contentItemId": "uuid",
  "sectionId": "block-id",
  "prompt": "make the second paragraph more formal"
}
```