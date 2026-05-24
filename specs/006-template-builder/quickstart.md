# Quickstart: Template Builder Engine

This guide walks you through bootstrapping a new template using the Builder Engine.

## 1. Register Building Blocks
Frontend applications must register their visual components with the CMS.

```bash
curl -X POST https://cms.hermes.app/api/blocks/register \
  -H "Authorization: Bearer <TENANT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "blocks": [
      {
        "name": "Hero Section",
        "slug": "hero",
        "schema": {
          "properties": {
            "title": { "type": "string", "label": "Headline" }
          }
        }
      }
    ]
  }'
```

## 2. Create a Page Template
1. Navigate to **Templates** in the Hermes Admin UI.
2. Click **New Template**.
3. Select an associated **Content Type** (e.g., "Landing Page").
4. Drag the **Hero** block into the canvas.

## 3. Map Fields
1. Click on the Hero block in the canvas.
2. In the properties panel, map the **Headline** property to the `title` field of your Content Type.
3. Save the template.

## 4. Deploy
1. Click **Deploy** in the Template Builder toolbar.
2. Select your **HostedSite**.
3. The system will trigger the sync webhook and the template will be live.

## 5. Fetch Hydrated Content
The frontend can now request the fully assembled page:

```bash
curl https://cms.hermes.app/api/content/my-page-id/hydrate \
  -H "Authorization: Bearer <TENANT_API_KEY>"
```
