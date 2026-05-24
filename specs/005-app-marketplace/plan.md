# Implementation Plan: Hermes App Marketplace (JWT Implementation)

## 1. Architectural Overview
The Hermes App Marketplace uses a hybrid architecture:
- **CMS Monolith (Payload CMS)**: Manages apps, tenants, and JWT generation.
- **AI Microservice (FastAPI)**: Consumes JWTs to scope AI tool executions and enforces fault tolerance via circuit breakers.

## 2. Bounded Contexts & DDD (FastAPI)
The AI service changes will be organized into:
- **Domain**: `AppMarketplace` domain logic, `JWTClaims` value object, and `CircuitBreaker` policies.
- **Application**: `MarketplaceService` to handle tool registration and execution orchestration.
- **Infrastructure**: `JWTMiddleware` for authentication, `PybreakerAdapter` for the circuit breaker, and `CMSAuditClient` for event-driven logging.

## 3. Data Model (Payload CMS)

### MarketplaceApps (Global)
- `name`: Text (required)
- `slug`: Text (unique, required)
- `baseUrl`: Text (required)
- `description`: Text
- `icon`: Upload (media)

### TenantApps (Multi-tenant)
- `tenant`: Relationship to `tenants` (required)
- `app`: Relationship to `marketplace-apps` (required)
- `status`: Select (active, inactive)
- `config`: JSON (setup parameters)
- `installedAt`: Date

### JWTTokens (Multi-tenant Tracking)
- `tenant`: Relationship to `tenants` (required)
- `tokenHash`: Text (required, indexed)
- `appId`: Relationship to `marketplace-apps` (required)
- `expiresAt`: Date
- `isRevoked`: Checkbox (default: false)

## 4. Security & Access Control
- `marketplace-apps`: Read-only for all, Create/Update/Delete for `super-admin`.
- `tenant-apps`: Scoped to `tenant_id` for `admin` and `editor`. `super-admin` has full access.
- `jwt-tokens`: Scoped to `tenant_id`. Only `admin` can generate new tokens.
- `generate-token` endpoint: Requires `admin` or `super-admin` role and valid `tenant_id`.

## 5. Technical Implementation Details

### JWT Generation (Payload)
- **Algorithm**: HS256 using `MARKETPLACE_JWT_SECRET`.
- **Claims**: `sub` (user id), `tenant_id`, `app_id`, `scopes` (array of strings), `iat`, `exp`.
- **Hashing**: Store SHA-256 hash of the JWT in `jwt-tokens`.

### Frontend Utilities (Next.js)
- **EventBus**: Wrapper around `window.dispatchEvent` and `window.addEventListener` with TypeScript generics for event payloads.
- **MFEErrorBoundary**: React component with `componentDidCatch` rendering Alexandria-themed fallback.
- **ScriptLoader**: Hook or utility using `Promise.race([fetchScript, timeoutPromise])`.

### FastAPI Middleware & Circuit Breaker
- **Middleware**: Extract `Authorization: Bearer <token>`, verify HS256, set `tenant_id` in request state/context vars.
- **Circuit Breaker**: Configure `pybreaker.CircuitBreaker(fail_max=3, timeout_duration=5)`. 
- **Tool Wrapper**: A LangChain `BaseTool` implementation that calls the external app's API with the circuit breaker.

## 6. Test-First Strategy (TDD)
### Phase 1: Payload Collections
- Test that non-admins cannot access `jwt-tokens`.
- Test that `tenant-apps` are isolated by tenant.

### Phase 2: JWT Endpoint
- Test that generating a token creates a record in `jwt-tokens`.
- Test that the signed JWT contains the correct claims.

### Phase 3: Frontend
- Unit test for `EventBus` delivery.
- Integration test for `MFEErrorBoundary` rendering fallback on error.
- Test script loader timeout logic.

### Phase 4: FastAPI
- Unit test for JWT verification middleware.
- Test circuit breaker transitions to OPEN after 3 failures.
- Test LLM response when a tool is bypassed.

## 7. Alexandria Design Compliance
- Use `AdminView` for the token display page if it's a standalone view.
- Ensure the "Generate Token" button uses Alexandria brand colors (`#3366cc`).
- Apply `:has()` selector resets in `globals.css` if the custom view causes layout shifts.
