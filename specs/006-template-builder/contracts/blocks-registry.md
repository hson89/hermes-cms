# API Contract: Block Registry

**Endpoint**: `POST /api/blocks/register`
**Auth**: Bearer Token (Tenant API Key)
**Content-Type**: `application/json`

## Request Payload
```json
{
  "blocks": [
    {
      "name": "Hero Section",
      "slug": "hero-section",
      "schema": {
        "properties": {
          "title": { "type": "string", "label": "Headline" },
          "subtitle": { "type": "string", "label": "Sub-headline" },
          "backgroundImage": { "type": "media", "label": "Background Image" }
        },
        "required": ["title"]
      },
      "thumbnailUrl": "https://cdn.example.com/hero-thumb.png"
    }
  ]
}
```

## Success Response (200 OK)
```json
{
  "registered": ["hero-section"],
  "deprecated": [],
  "message": "Successfully registered 1 block(s)."
}
```

## Error Response (400 Bad Request)
```json
{
  "error": "Invalid Block Schema",
  "details": "Property 'type' in 'title' must be one of: string, number, media, boolean."
}
```
