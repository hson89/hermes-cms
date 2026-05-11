# Hermes AI Architecture

## Overview
Hermes AI uses a modular, hybrid architecture combining a Node.js/Next.js-based Payload CMS setup and a Python-based FastAPI AI Microservice.

## Components

### 1. Payload CMS (Core)
- **Framework**: Payload CMS v3 (Next.js App Router)
- **Database**: PostgreSQL (via Payload Postgres Adapter)
- **Responsibilities**:
  - Structured content storage (ContentItems, ContentTypes).
  - Multi-tenancy enforcement.
  - Role-based access control (RBAC).
  - Headless API delivery (REST & GraphQL).
  - Admin UI (React).

### 2. AI Agent Service
- **Framework**: FastAPI (Python 3.14+)
- **Integration**: LangChain + OpenAI
- **Responsibilities**:
  - LLM prompt generation.
  - Generative content and schema creation.
  - Copilot text editing block-level capabilities.

### 3. Internal Communication
The CMS communicates with the AI microservice via internal HTTP REST requests. Security is managed via an internal shared secret (`X-Internal-Secret`).
