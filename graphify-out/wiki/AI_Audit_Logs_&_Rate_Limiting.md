# AI Audit Logs & Rate Limiting

> 63 nodes · cohesion 0.04

## Key Concepts

- **payload.config.ts** (92 connections) — `apps/content-management-engine/src/payload.config.ts`
- **index.ts** (4 connections) — `apps/content-management-engine/src/collections/HostedSites/index.ts`
- **index.ts** (4 connections) — `apps/content-management-engine/src/collections/JWTTokens/index.ts`
- **index.ts** (4 connections) — `apps/content-management-engine/src/collections/TenantApps/index.ts`
- **route.ts** (3 connections) — `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/route.ts`
- **index.ts** (2 connections) — `apps/content-management-engine/src/collections/AIAuditLogs/index.ts`
- **AIAuditLogs** (2 connections) — `apps/content-management-engine/src/collections/AIAuditLogs/index.ts`
- **index.ts** (2 connections) — `apps/content-management-engine/src/collections/AIRateLimits/index.ts`
- **AIRateLimits** (2 connections) — `apps/content-management-engine/src/collections/AIRateLimits/index.ts`
- **route.ts** (2 connections) — `apps/content-management-engine/src/app/api/ai-drafting/sessions/cleanup/route.ts`
- **route.ts** (2 connections) — `apps/content-management-engine/src/app/api/ai/download-image/route.ts`
- **HostedSites** (2 connections) — `apps/content-management-engine/src/collections/HostedSites/index.ts`
- **JWTTokens** (2 connections) — `apps/content-management-engine/src/collections/JWTTokens/index.ts`
- **route.ts** (2 connections) — `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/lock/route.ts`
- **endpoints.ts** (2 connections) — `apps/content-management-engine/src/services/marketplace/endpoints.ts`
- **generateMarketplaceTokenEndpoint** (2 connections) — `apps/content-management-engine/src/services/marketplace/endpoints.ts`
- **index.ts** (2 connections) — `apps/content-management-engine/src/collections/MarketplaceApps/index.ts`
- **MarketplaceApps** (2 connections) — `apps/content-management-engine/src/collections/MarketplaceApps/index.ts`
- **route.ts** (2 connections) — `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/promote/route.ts`
- **route.ts** (2 connections) — `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/rollback/route.ts`
- **check-data.ts** (2 connections) — `apps/content-management-engine/src/scripts/check-data.ts`
- **check-key.ts** (2 connections) — `apps/content-management-engine/src/scripts/check-key.ts`
- **create-first-user.ts** (2 connections) — `apps/content-management-engine/src/scripts/create-first-user.ts`
- **create-test-user.ts** (2 connections) — `apps/content-management-engine/src/scripts/create-test-user.ts`
- **inspect-key.ts** (2 connections) — `apps/content-management-engine/src/scripts/inspect-key.ts`
- *... and 38 more nodes in this community*

## Relationships

- [[Tenant Access Control]] (21 shared connections)
- [[Module Group 318]] (4 shared connections)
- [[Module Group 176]] (4 shared connections)
- [[Admin Custom Views & Import Map]] (3 shared connections)
- [[Module Group 417]] (3 shared connections)
- [[Module Group 300]] (2 shared connections)
- [[Module Group 483]] (2 shared connections)
- [[Module Group 84]] (2 shared connections)
- [[Module Group 323]] (2 shared connections)
- [[Module Group 516]] (2 shared connections)
- [[Module Group 462]] (2 shared connections)
- [[Module Group 471]] (1 shared connections)

## Source Files

- `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/lock/route.ts`
- `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/promote/route.ts`
- `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/rollback/route.ts`
- `apps/content-management-engine/src/app/api/ai-drafting/sessions/[id]/route.ts`
- `apps/content-management-engine/src/app/api/ai-drafting/sessions/cleanup/route.ts`
- `apps/content-management-engine/src/app/api/ai/download-image/route.ts`
- `apps/content-management-engine/src/collections/AIAuditLogs/index.ts`
- `apps/content-management-engine/src/collections/AIRateLimits/index.ts`
- `apps/content-management-engine/src/collections/HostedSites/index.ts`
- `apps/content-management-engine/src/collections/JWTTokens/index.ts`
- `apps/content-management-engine/src/collections/MarketplaceApps/index.ts`
- `apps/content-management-engine/src/collections/TenantApps/index.ts`
- `apps/content-management-engine/src/collections/Users/index.ts`
- `apps/content-management-engine/src/payload.config.ts`
- `apps/content-management-engine/src/scripts/check-data.ts`
- `apps/content-management-engine/src/scripts/check-key.ts`
- `apps/content-management-engine/src/scripts/create-first-user.ts`
- `apps/content-management-engine/src/scripts/create-test-user.ts`
- `apps/content-management-engine/src/scripts/inspect-key.ts`
- `apps/content-management-engine/src/scripts/list-media.ts`

## Audit Trail

- EXTRACTED: 194 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*