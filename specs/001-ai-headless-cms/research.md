# Research: Multi-tenant Headless CMS

## Language / Version
- **Decision**: TypeScript with Node.js 22.x
- **Rationale**: Strong ecosystem for both backend and frontend. Great support for AI SDKs (OpenAI/Anthropic) and unified types across the stack.
- **Alternatives considered**: Python, Go. Rejected due to the desire for a unified JavaScript ecosystem across backend, admin frontend, and starter templates.

## Primary Dependencies
- **Decision**: NestJS for Backend, React (Next.js) for Admin UI, Prisma ORM.
- **Rationale**: NestJS provides a solid architecture for enterprise-grade applications. Prisma simplifies multi-tenant schema management.
- **Alternatives considered**: Express, Fastify. Rejected as NestJS offers better structure for complex multi-tenant logic.

## Storage (Multi-tenancy approach)
- **Decision**: PostgreSQL with Schema-based isolation.
- **Rationale**: Fulfills the "Physical Isolation (Separate DB/Schema)" requirement efficiently without the overhead of spinning up completely separate database instances per tenant.
- **Alternatives considered**: Row-level security (RLS), separate database instances. Schema-based offers the best balance of isolation and maintainability.

## Testing
- **Decision**: Jest for unit tests, Supertest for API integration tests.
- **Rationale**: Industry standard for TypeScript projects.
- **Alternatives considered**: Mocha, Vitest.

## Scale / Scope
- **Decision**: Designed for horizontal scaling using stateless backend nodes, Redis for AI session state, and scalable PostgreSQL.
- **Rationale**: The AI agent sessions and front-end starter deployments require robust scaling infrastructure.