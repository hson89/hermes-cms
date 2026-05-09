# Hermes Multi-tenant Headless CMS

Hermes is an AI-powered, multi-tenant headless CMS designed to accelerate content creation and delivery. It combines the power of Payload CMS with a custom Python-based AI microservice to provide generative schema design and intelligent "Copilot" content editing.

## Architecture

The project follows a hybrid architecture:
- **Core CMS (`apps/cms`)**: A Payload CMS (Node.js/Next.js) instance that handles structured data storage, multi-tenancy, user roles, API Key authentication, and the admin interface.
- **AI Microservice (`apps/ai-agent-service`)**: A FastAPI Python application leveraging LangChain and OpenAI to provide AI-driven content and schema generation.
- **Frontend Starters (`apps/frontend-starters`)**: Managed Next.js and Astro templates that can be automatically deployed from the CMS.

See `docs/architecture.md` for more details.

## Features
- **Strict Multi-Tenancy**: Tenants only see their own content, users, and API keys.
- **AI Content Generation**: Provide a prompt and let AI generate full data schemas.
- **AI Copilot Editor**: A side-by-side editing experience where AI suggests improvements or writes specific sections of your content.
- **Managed Deployments**: Deploy pre-configured front-end starters directly from the CMS admin dashboard.
- **API Delivery**: Built-in REST and GraphQL delivery endpoints secured via API keys.

## Getting Started
See the individual application directories (`apps/cms` and `apps/ai-agent-service`) for specific setup and running instructions.
