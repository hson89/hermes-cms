# Feature Spec: Hermes App Marketplace (JWT Implementation)

## User Stories

### Story 1: Scoped Marketplace Token Generation
**As a** Tenant Administrator
**I want to** generate a secure marketplace connection token for a specific 3rd-party integration
**So that** I can authorize an external vehicle configurator app to safely read my stock data without giving it global database access.

**Acceptance Criteria:**
- The Payload CMS admin UI provides a "Generate Token" action button within the tenant-apps record view page.
- Clicking the button sends a payload containing the tenantId, target appId, and selected permission checkboxes to the /api/marketplace/generate-token endpoint.
- The backend responds with a raw JWT token containing claims structured explicitly for tenant_id, app_id, and scopes.
- The plain-text token string is displayed exactly once to the administrator with a copy-to-clipboard shortcut, and the cryptographic hash is persisted in the jwt-tokens database collection for validation tracking.

### Story 2: Real-time Multi-Component Frontend Sync
**As a** Dealership Customer
**I want to** modify vehicle options on the digital showroom page
**So that** the final price summary updates instantly without reloading the entire window.

**Acceptance Criteria:**
- The vehicle options matrix (3rd-party micro-frontend) fires an asynchronous payload to the central client-side event bus on user input.
- The event bus translates the payload into an isolated CONFIGURATOR_UPDATED browser custom event.
- The Pricing Summary component listening on the event bus captures the parameters, executes the sum logic, and re-renders the total balance in the DOM dynamically.
- The outer Next.js application shell traps the high-level configuration event state and pushes an audit trail update back to the Hermes backend via an asynchronous background script request.

### Story 3: Graceful Outage Isolation via React Error Boundaries
**As a** Dealership Owner
**I want to** my primary web landing pages to remain functional even if a partner payment gateway or inventory provider service goes down
**So that** I do not lose web traffic or incoming customer leads due to a third-party script crash.

**Acceptance Criteria:**
- All external third-party micro-frontend injection components are wrapped globally by an MFEErrorBoundary component block.
- If an embedded component fails to resolve within a strict 3000ms network timeout window, the loader cancels the script promise thread immediately.
- If a script crashes at runtime, the React Error Boundary catches the unhandled exception, limits the visual failure to that specific container grid, and renders an pre-configured fallback UI component layout.
- The rest of the Next.js landing page remains fully interactive, allowing customers to continue navigating and submitting text contact forms normally.

### Story 4: FastAPI AI Tool Execution Circuit Breaker
**As a** Content Editor using the AI drafting assistant
**I want to** the LangChain agent loops to gracefully bypass non-responsive external lookup tools
**So that** my drafting generation loop finishes compiling text even if a partner SEO or compliance checking app is timing out.

**Acceptance Criteria:**
- The FastAPI service dynamically registers installed third-party apps as local LangChain tool wrappers using the verified JWT claims context.
- All outbound calls to external tools execute through a configured python pybreaker instance.
- If an external endpoint takes longer than 5000ms or throws server anomalies for 3 consecutive execution attempts, the circuit transitions immediately to OPEN.
- While the circuit is OPEN, subsequent tool calls bypass the remote endpoint entirely, returning a system notification straight back to the LLM. The assistant must explain the external dependency outage naturally while delivering the rest of the compiled copy successfully.

## Implementation Plan

### 1. Database Collections (Payload CMS)
- Create `marketplace-apps` collection.
- Create `tenant-apps` collection with multi-tenancy.
- Create `jwt-tokens` collection for tracking hashes.

### 2. JWT Generation Endpoint (Payload CMS)
- Implement `POST /api/marketplace/generate-token`.
- Add access control (Admin only).
- Implement HS256 signing logic.
- Implement token hashing and persistence.

### 3. Admin UI Customization (Payload CMS)
- Add "Generate Token" button to `tenant-apps` record view.
- Implement modal/display for one-time token view with clipboard shortcut.

### 4. Frontend Micro-frontend Architecture (Next.js)
- Create `PubSub` event bus utility.
- Implement `MFEErrorBoundary` component.
- Implement script loader with `Promise.race` timeout.

### 5. FastAPI AI Service Integration
- Implement JWT authentication middleware.
- Implement LangChain tool wrapper registration.
- Integrate `pybreaker` for circuit breaking logic.
- Implement API-driven audit logging for circuit events.
