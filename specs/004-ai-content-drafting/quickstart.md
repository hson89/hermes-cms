# Quickstart: AI Content Drafting

**Feature**: 004-ai-content-drafting  
**Date**: 2026-05-18

---

## Prerequisites

1. Docker infrastructure running (2× Postgres + Kafka):
   ```bash
   docker-compose up -d
   ```

2. Content Management Engine running:
   ```bash
   cd apps/content-management-engine && pnpm dev
   ```

3. Content Authoring Service running:
   ```bash
   cd apps/content-authoring-service
   ./venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. At least one tenant and user created via the CMS admin.
5. At least one ContentType defined for the tenant.

---

## Development Setup for This Feature

### CMS Engine — New Collections

After implementing the new collections, regenerate Payload types:
```bash
cd apps/content-management-engine
pnpm payload generate:types
pnpm payload generate:importmap
```

### Content Authoring Service — New Domain Context

After adding the `content_drafting` domain context:
```bash
cd apps/content-authoring-service
# Run database migrations
./venv/bin/alembic upgrade head

# Run tests
pytest tests/ -v
```

### Environment Variables

Add to `apps/content-authoring-service/.env` and `apps/content-management-engine/.env` where appropriate:
```env
# Shared Security Key between CMS and AI Service
INTERNAL_SECRET=hermes-internal-secret-token-key

# Content Authoring Service Postgres (port 5433)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hermes_authoring

# Image generation (if using DALL-E)
OPENAI_API_KEY=sk-...

# Or for other providers
IMAGE_GENERATION_PROVIDER=openai  # openai | stability | none
```

---

## Testing the Feature

### 1. Create a DraftingSession

```bash
# Via Custom Next.js API route (requires auth cookie)
curl -X POST http://localhost:3000/api/ai-drafting/sessions \
  -H "Content-Type: application/json" \
  -b "payload-token=<your-session-cookie>" \
  -d '{"contentType": "<content-type-id>", "locale": "en"}'
```

### 2. Start AI Draft Generation

```bash
# Via CMS proxy (SSE stream)
curl -N -X POST http://localhost:3000/api/ai/draft \
  -H "Content-Type: application/json" \
  -b "payload-token=<your-session-cookie>" \
  -d '{
    "prompt": "Write an article about sustainable energy",
    "contentType": "<content-type-id>",
    "draftingSession": "<session-id>",
    "locale": "en"
  }'
```

### 3. Test Inline Refinement

```bash
curl -N -X POST http://localhost:3000/api/ai/refine \
  -H "Content-Type: application/json" \
  -b "payload-token=<your-session-cookie>" \
  -d '{
    "text": "Solar energy is good for the environment.",
    "instruction": "expand",
    "draftingSession": "<session-id>"
  }'
```

### 4. Promote Draft to ContentItem

```bash
curl -X POST http://localhost:3000/api/ai-drafting/sessions/<session-id>/promote \
  -H "Content-Type: application/json" \
  -b "payload-token=<your-session-cookie>" \
  -d '{"action": "save"}'
```

---

## Running Tests

```bash
# CMS Engine tests
cd apps/content-management-engine
pnpm test

# Content Authoring Service tests
cd apps/content-authoring-service
pytest tests/ -v

# Specific test suites
pytest tests/test_drafting_service.py -v
pytest tests/test_refine_service.py -v
```

### Local Session & Rate-Limit Cleanup

During development, you can manually trigger the expired session and rate-limit database cleanup cron endpoint to release stale locks or reset test states.

```bash
# Trigger the secure cleanup API endpoint locally using the internal secret
curl -X POST http://localhost:3000/api/ai-drafting/sessions/cleanup \
  -H "X-Internal-Secret: <your-configured-internal-secret>"
```

---

## Key Files to Modify/Create

### CMS Engine (apps/content-management-engine)

| File | Action | Purpose |
|------|--------|---------|
| `src/collections/DraftingSessions/index.ts` | **Create** | DraftingSession collection definition |
| `src/collections/StyleModifiers/index.ts` | **Create** | StyleModifier collection definition |
| `src/collections/AIAuditLogs/index.ts` | **Create** | AIAuditLog collection definition |
| `src/collections/AIRateLimits/index.ts` | **Create** | Postgres-backed rate limit tracking |
| `src/payload.config.ts` | **Modify** | Register new collections + drafting view |
| `src/components/views/DraftingWorkspace.tsx` | **Create** | Main split-view drafting UI |
| `src/components/Editor/FloatingAIBar.tsx` | **Create** | Floating refinement toolbar |
| `src/components/Editor/AISuggestIndicator.tsx` | **Create** | Per-field AI suggestion badge |
| `src/app/api/ai/draft/route.ts` | **Create** | SSE proxy endpoint (outside Payload group) |
| `src/app/api/ai/refine/route.ts` | **Create** | Refinement proxy endpoint |
| `src/app/api/ai/download-image/route.ts` | **Create** | Image download (streaming pipeline) |
| `src/services/rate-limiter.ts` | **Create** | Postgres-backed sliding window rate limiter |
| `src/services/markdown-to-lexical.ts` | **Create** | Markdown → Lexical JSON conversion |

### Content Authoring Service (apps/content-authoring-service)

| File | Action | Purpose |
|------|--------|---------|
| `src/domain/content_drafting/__init__.py` | **Create** | Bounded context init |
| `src/domain/content_drafting/models.py` | **Create** | ContentDraft, DraftField value objects |
| `src/domain/content_drafting/prompts.py` | **Create** | System prompts for content drafting |
| `src/application/drafting_service.py` | **Create** | Content drafting orchestration service with context continuity |
| `src/application/refine_service.py` | **Create** | Stateless text refinement service |
| `src/infrastructure/database.py` | **Verify** | SQLAlchemy database setup (Existing) |
| `src/infrastructure/models.py` | **Verify** | SQLAlchemy database entity model schemas (including `AIAgentSession`) (Existing) |
| `src/infrastructure/repository.py` | **Verify** | Repository layer for database persistence (Existing) |
| `src/infrastructure/tools/__init__.py` | **Create** | LangChain tools package |
| `src/infrastructure/tools/image_generator.py` | **Create** | Image generation LangChain tool |
| `src/infrastructure/tools/schema_resolver.py` | **Create** | Schema lookup/creation tool |
| `src/main.py` | **Modify** | Register new endpoints + add auth validation middleware |
| `alembic/versions/` | **Create** | Database migration script mapping the `ai_agent_sessions` table |
| `tests/test_drafting_service.py` | **Create** | Drafting service unit tests |
| `tests/test_refine_service.py` | **Create** | Refine service unit tests |
