# Research & Decisions

## Language/Version
**Decision**: TypeScript (Node.js 24+) for CMS, Python (3.12+) for AI Microservices.
**Rationale**: Python is the industry standard for AI, ML, and data engineering. It offers the most robust ecosystem for LLM orchestration (LangChain, LangGraph) and broad, agnostic support for various LLM providers (OpenAI, Anthropic, Google). Node.js 24+ ensures the latest LTS support for the Next.js/Payload ecosystem.
**Alternatives considered**: TypeScript for AI services (Rejected in favor of Python's superior AI ecosystem).

## Primary Dependencies
**Decision**: 
- CMS: Payload CMS 3.84+, Next.js 15+, `@payloadcms/plugin-multi-tenant`
- AI Microservice: FastAPI 0.136+, SQLAlchemy 2.0+, LangChain 1.2+ (Python), Agnostic LLM Interfaces
- Comms: Kafka or RabbitMQ, Internal REST APIs
**Rationale**: Payload handles the generic content and admin UI perfectly. FastAPI provides high-performance, async-native Python microservices that fit well into DDD. LangChain in Python provides the best ecosystem for building multi-provider, agnostic AI agents with complex tool-use and memory. Specifying the latest major/minor stable versions ensures we take advantage of up-to-date performance and security improvements.
**Alternatives considered**: Building the entire backend in a single language. NestJS for microservices.

## Multi-Tenancy Approach
**Decision**: Logical Isolation via Payload CMS
**Rationale**: Payload's official multi-tenant plugin handles the heavy lifting of user/tenant mapping and access control in the CMS. The AI Microservice will respect these tenant boundaries by associating all sessions and generated data with the incoming `tenantId`.

## Inter-Service Communication
**Decision**: Asynchronous events via Message Broker (e.g., Kafka) and Synchronous internal REST APIs.
**Rationale**: When an AI generation request is made via the CMS, the CMS will fire an event to the AI microservice. The AI microservice will stream updates or call back via REST to the CMS to update content schemas and items.