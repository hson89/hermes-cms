# Contract: Webhook Deployment Payload

**Trigger**: Click "Deploy" on a PageTemplate.
**Destination**: `HostedSite.webhooks.templateSyncUrl`

## Payload
```json
{
  "event": "template.published",
  "timestamp": "2026-05-24T14:30:00Z",
  "tenant": "tenant-uuid",
  "data": {
    "templateId": "tmpl_789",
    "templateSlug": "landing-page-v1",
    "contentType": "landing-page",
    "action": "sync_required"
  }
}
```

## Expected Response
- **Status**: 200 OK or 202 Accepted.
- **Action**: The frontend application should initiate a cache purge or a re-fetch of the template configuration.
