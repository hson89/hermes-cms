# API Contract: Content Delivery (Hydrated)

**Endpoint**: `GET /api/content/:id/hydrate`
**Auth**: Bearer Token (Tenant API Key)
**Description**: Fetches a Content Item, resolves its associated PageTemplate, and returns a hydrated block tree.

## Success Response (200 OK)
```json
{
  "id": "content-item-123",
  "template": "landing-page-v1",
  "blocks": [
    {
      "block": "hero-section",
      "data": {
        "title": "Welcome to Hermes",
        "subtitle": "The AI-First CMS",
        "backgroundImage": {
          "url": "https://assets.hermes.app/banner.jpg",
          "alt": "Hermes Banner"
        }
      }
    },
    {
      "block": "feature-grid",
      "data": {
        "items": [ ... ]
      }
    }
  ]
}
```

## Error Response (404 Not Found)
```json
{
  "error": "Not Found",
  "message": "Content Item or associated PageTemplate not found."
}
```
