# Implementation Tasks: Hermes App Marketplace

## Phase 1: Payload CMS Collections & TDD Setup
- [x] Create `MarketplaceApps` collection with access control (`src/collections/MarketplaceApps/index.ts`)
- [x] Create `TenantApps` collection with multi-tenancy and isolation tests (`src/collections/TenantApps/index.ts`)
- [x] Create `JWTTokens` collection for tracking hashes with secure access control (`src/collections/JWTTokens/index.ts`)
- [x] Register new collections in `payload.config.ts`
- [x] **TDD**: Write tests for collection access control and tenant isolation.

## Phase 2: JWT Generation Backend (TDD)
- [x] **TDD**: Write tests for the `generate-token` endpoint (claims verification, hash persistence).
- [x] Define `MARKETPLACE_JWT_SECRET` in environment.
- [x] Implement `POST /api/marketplace/generate-token` logic (HS256).
- [x] Implement SHA-256 token hashing and persistence in `jwt-tokens`.
- [x] Add admin-only access control for the endpoint.

## Phase 3: Admin UI Enhancements (Alexandria Design)
- [x] Create "Generate Token" action button component (Named export, Alexandria themed).
- [x] Register button in `TenantApps` collection view.
- [x] Create a custom view or modal for one-time token display using `AdminView` if applicable.
- [x] Implement "Copy to Clipboard" shortcut.
- [x] Add "Marketplace" and "Installed Apps" to the sidebar navigation menu.
- [x] Apply Alexandria design system to `MarketplaceApps` and `TenantApps` list and edit views (Custom React components).
- [x] **Verification**: Ensure no layout shifts and proper sidebar/header offsets.

## Phase 4: Frontend Micro-frontend Utilities (TDD)
- [x] **TDD**: Write tests for `EventBus`, `MFEErrorBoundary`, and `ScriptLoader` timeout.
- [x] Implement type-safe `EventBus` utility (`CONFIGURATOR_UPDATED`).
- [x] Implement `MFEErrorBoundary` React component.
- [x] Implement async script loader with 3000ms timeout logic (`Promise.race`).

## Phase 5: FastAPI AI Service Integration (DDD & TDD)
- [x] **TDD**: Write tests for JWT verification middleware and circuit breaker state transitions.
- [x] **Infrastructure**: Implement JWT verification middleware (HS256).
- [x] **Domain**: Define `JWTClaims` and `CircuitBreaker` policies.
- [x] **Application**: Implement `MarketplaceService` for dynamic LangChain tool registration.
- [x] **Infrastructure**: Integrate `pybreaker` (3 failures, 5000ms timeout) and API audit logging.
- [x] **Application**: Ensure AI agent explains outages naturally when tools are bypassed.
