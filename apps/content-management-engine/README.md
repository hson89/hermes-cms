# Hermes CMS - Content Management Engine

The **Content Management Engine** is the core headless CMS for Hermes AI, built with Payload CMS 3.x and Next.js 16. It features strict multi-tenancy, AI-powered content drafting, a custom premium editorial interface ("Alexandria"), and a headless API for content delivery.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16.2+
- **CMS**: [Payload CMS](https://payloadcms.com/) 3.84+
- **Database**: PostgreSQL (via `@payloadcms/db-postgres`)
- **Styling**: Tailwind CSS 4.3 with custom "Alexandria" design tokens
- **Rich Text**: Hybrid engine using **TipTap 3.x** for the premium AI Drafting Workspace and **Lexical** for standard Payload fields and storage.
- **Testing**: Jest (Unit) & Playwright (E2E)
- **Language**: TypeScript 6.0+

## Key Features

- **Multi-Tenancy**: Logical isolation of content, media, and API keys per workspace using `@payloadcms/plugin-multi-tenant`.
- **AI Co-Creation**: Built-in `DraftingWorkspace` and `ChatPanel` that interface with the external Content Authoring Service for schema generation, content drafting, and iterative refinement.
- **Alexandria Editor**: A custom, high-end editorial interface powered by TipTap, featuring drop-caps, AI-driven refinement, and markdown support.
- **Dynamic Content Types**: AI or manually generated JSON schemas (`ContentTypes`) that dictate the structure of `ContentItems`.
- **Marketplace & Integrations**: Global directory of 3rd-party apps with tenant-specific installations and securely scoped JWT generation.
- **Hosted Sites Management**: Provisioning and management of front-end starter templates (e.g., Next.js Blog, Astro Portfolio) bound to specific tenants.
- **Audit Logging**: Comprehensive system and AI interaction logging for compliance and monitoring.

## Getting Started

### Prerequisites

- Node.js 26+
- pnpm 11+
- PostgreSQL 18+ (can be run via Docker at project root)

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Key variables include:
- `DATABASE_URI`: Connection string for PostgreSQL.
- `PAYLOAD_SECRET`: Secret key for Payload session encryption.
- `CONTENT_AUTHORING_SERVICE_URL`: URL to the FastAPI AI microservice.
- `INTERNAL_SERVICE_SECRET`: Pre-shared key for secure CMS-to-AI communication.

### Installation

Install dependencies from the workspace root:

```bash
pnpm install
```

### Development

Start the Next.js development server (uses Webpack via `next dev --webpack` for WSL stability):

```bash
pnpm dev
```
*Note: Due to known WSL 2 compiler stability issues with Next.js 16/Turbopack, the dev script explicitly uses the `--webpack` flag.*

The Payload Admin panel will be accessible at `http://localhost:3000/admin`.

### Building for Production

```bash
pnpm build
pnpm start
```

## Testing

The project uses Jest for unit/integration tests and Playwright for End-to-End (E2E) testing.

**Run Unit Tests:**
```bash
pnpm test
```

**Run E2E Tests:**
```bash
pnpm exec playwright test
```

## Marketplace & Integrations Guide

The Hermes CMS features a robust marketplace system allowing 3rd-party integrations to securely connect to tenant data. Follow these steps to register, install, and authorize an integration.

### 1. Register a Global Application (Super Admin)
Before an app can be installed by any tenant, it must be registered in the global directory.
1.  Navigate to **Marketplace** in the sidebar.
2.  Click **Register App**.
3.  Provide an **Application Name**, a unique **Slug**, and the **Service Base URL** (the root endpoint of the integration).
4.  Add a **Description** and optional **Icon**.
5.  Click **Register Application**.

### 2. Install an App for a Tenant
Once registered, an app can be "installed" into a specific tenant workspace.
1.  Navigate to **Installed Apps** in the sidebar.
2.  Click **Install App**.
3.  Select the **Marketplace Application** and the **Target Tenant Workspace**.
4.  Set the status to **Active**.
5.  In the **Setup Manifest (JSON)** field, provide any app-specific secrets or configuration required by the integration.
6.  Click **Execute Installation**.

### 3. Generate a Secure Connection Token
To allow the 3rd-party app to authenticate with the Hermes API:
1.  Open the specific installation from the **Installed Apps** list.
2.  In the right sidebar, find the **Marketplace Authorization** panel.
3.  Select the required **Permissions** (e.g., Read Content, Write Content).
4.  Click **Generate Token**.
5.  **Important**: Copy the generated JWT immediately. It is shown only once. The database stores only a SHA-256 hash of this token for revocation purposes.

### 4. Integration Technical Details
- **Authentication**: Integrations should use the generated JWT in the `Authorization: Bearer <token>` header.
- **Event Bus**: For micro-frontends (MFEs), use the `EventBus` utility in `src/services/marketplace/frontend-utils.ts` to communicate between the CMS shell and the integrated component via standard `CustomEvent` APIs.
- **Error Boundaries**: Wrap 3rd-party components in the `MFEErrorBoundary` (located in `src/components/marketplace/`) to prevent external script failures from crashing the admin UI.

## Architecture & Conventions

- **Custom Admin Views**: Standard Payload UI is heavily customized using the `AdminView` wrapper to implement the "Alexandria" design system and integrate the new **TipTap-powered** editorial canvas. View components live in `src/components/views/`.
- **UI Guardrails**: Standalone custom views use the `AdminView` component to prevent layout shifts. Global CSS isolates Payload defaults using `:has()` overrides.
- **Endpoints**: Custom REST endpoints are defined per collection (e.g., `src/collections/ContentTypes/endpoints.ts`) to proxy requests to the AI Microservice securely.
