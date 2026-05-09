# Next.js Blog Starter

This is a pre-configured Next.js template designed to connect seamlessly with the Hermes Headless CMS.

## Environment Variables

When deployed via the Hermes CMS Deployment Service, the following environment variables will be injected automatically:

- `PAYLOAD_URL`: The URL of the Hermes CMS instance.
- `PAYLOAD_API_KEY`: The API Key generated for the specific tenant.

## Fetching Content

```typescript
// Example data fetching
const res = await fetch(`${process.env.PAYLOAD_URL}/api/content-items`, {
  headers: {
    'Authorization': `API-Key ${process.env.PAYLOAD_API_KEY}`
  }
})
const data = await res.json()
```
