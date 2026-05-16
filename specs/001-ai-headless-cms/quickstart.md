# Quickstart: Multi-tenant Headless CMS

## Prerequisites
- Node.js 20+
- PostgreSQL (running locally or via Docker)
- OpenAI API Key

## Setup
1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Configure environment variables in `.env`:
   ```env
   DATABASE_URI="postgresql://user:pass@localhost:5432/hermes"
   PAYLOAD_SECRET="your-secret"
   OPENAI_API_KEY="sk-..."
   ```
3. Start the Payload CMS instance (development mode):
   ```bash
   pnpm dev
   ```

## Development Workflow
1. Define custom Payload Collections and configure `@payloadcms/plugin-multi-tenant` for new entities.
2. Develop AI Copilot endpoints using Payload's `customEndpoints` in collection configs.
3. Write Jest tests leveraging Payload's Local API to verify access control.