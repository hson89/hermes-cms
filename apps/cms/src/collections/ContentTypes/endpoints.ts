import type { Endpoint, PayloadRequest } from 'payload'
import { getPrimaryTenantId } from '../Users/utils'
import { generatePayloadTS } from '../../services/export-service'

/**
 * Custom endpoint: POST /api/content-types/generate-schema
 *
 * Receives a natural-language prompt from an authenticated user, dispatches
 * an event to the AI Microservice via the message broker (Kafka), and returns
 * a 202 Accepted with a session ID that the client can poll.
 *
 * T017 - Implement POST /api/ai/generate-schema custom endpoint
 * T018 - Integrate CMS endpoint with AI Microservice via message broker or REST
 */
export const generateSchemaEndpoint: Endpoint = {
  path: '/generate-schema',
  method: 'post',
  handler: async (req) => {
    const { user, payload } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = getPrimaryTenantId(user)
    if (!tenantId) {
      return Response.json(
        { error: 'User does not belong to a tenant.' },
        { status: 403 },
      )
    }

    let body: { prompt?: string }
    try {
      body = await (req as unknown as Request).json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { prompt } = body
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return Response.json({ error: 'prompt is required.' }, { status: 400 })
    }

    try {
      // Dispatch to AI Microservice
      const aiServiceUrl =
        process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
      const response = await fetch(`${aiServiceUrl}/api/ai/generate-schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Internal service-to-service auth header
          'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET ?? '',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tenant_id: tenantId,
          user_id: user.id,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[generate-schema] AI service error:', errorBody)
        return Response.json(
          { error: 'AI service failed to process request.' },
          { status: 502 },
        )
      }

      const result = await response.json()

      // Log the natural language prompt and generated schema outcome to AIPromptHistory (T007b)
      try {
        await payload.create({
          collection: 'ai-prompt-history' as any,
          data: {
            prompt: prompt.trim(),
            generatedSchema: result.content_schema || result.schema || {},
            user: user.id,
            tenant: tenantId,
          },
          overrideAccess: true,
        })
      } catch (logErr) {
        console.error('[generate-schema] Failed to log prompt to AIPromptHistory:', logErr)
      }

      return Response.json(
        {
          message: 'Schema generation initiated.',
          sessionId: result.sessionId || result.session_id,
          status: 'processing',
        },
        { status: 202 },
      )
    } catch (err) {
      console.error('[generate-schema] Unexpected error:', err)
      return Response.json(
        { error: 'Internal server error.' },
        { status: 500 },
      )
    }
  },
}

/**
 * Custom endpoint: GET /api/content-types/sessions/:id
 *
 * Proxies session polling requests securely using internal authentication secrets.
 */
export const getSessionStatusEndpoint: Endpoint = {
  path: '/sessions/:id',
  method: 'get',
  handler: async (req) => {
    const { user } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = getPrimaryTenantId(user)
    if (!tenantId) {
      return Response.json(
        { error: 'User does not belong to a tenant.' },
        { status: 403 },
      )
    }

    // Extract session ID securely from the req.url
    let sessionId = ''
    try {
      const urlObj = new URL(req.url || '')
      const parts = urlObj.pathname.split('/')
      sessionId = parts[parts.length - 1]
    } catch (err) {
      return Response.json({ error: 'Invalid request URL.' }, { status: 400 })
    }

    if (!sessionId) {
      return Response.json({ error: 'Session ID is required.' }, { status: 400 })
    }

    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
      const response = await fetch(`${aiServiceUrl}/api/ai/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET ?? '',
        },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[session-status] AI service error:', errorBody)
        return Response.json(
          { error: 'AI service failed to retrieve session.' },
          { status: response.status },
        )
      }

      const result = await response.json()
      return Response.json(result)
    } catch (err) {
      console.error('[session-status] Unexpected error:', err)
      return Response.json(
        { error: 'Internal server error.' },
        { status: 500 },
      )
    }
  },
}

export const exportSchemaEndpoint: Endpoint = {
  path: '/:id/export',
  method: 'get',
  handler: async (req) => {
    const { user, payload } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let id = ''
    try {
      const urlObj = new URL(req.url || '')
      const parts = urlObj.pathname.split('/')
      const exportIdx = parts.indexOf('export')
      if (exportIdx > 0) {
        id = parts[exportIdx - 1]
      }
    } catch (err) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (!id) {
      return Response.json({ error: 'Content Type ID is required' }, { status: 400 })
    }

    try {
      const doc = await payload.findByID({
        collection: 'content-types' as any,
        id,
        overrideAccess: true,
      })

      if (!doc) {
        return Response.json({ error: 'Content Type not found' }, { status: 404 })
      }

      // Enforce strict logical tenant isolation to prevent cross-tenant data leaks (Principle I)
      if ((user as any).role !== 'super-admin') {
        const tenantId = getPrimaryTenantId(user)
        if (!tenantId) {
          return Response.json(
            { error: 'User does not belong to a tenant.' },
            { status: 403 },
          )
        }
        const docTenantId = typeof doc.tenant === 'object' ? (doc.tenant as any)?.id : doc.tenant
        if (!docTenantId || String(docTenantId) !== String(tenantId)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      return new Response(JSON.stringify(doc.schema || {}, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${doc.slug || 'schema'}.json"`,
        },
      })
    } catch (err) {
      console.error('[export] Unexpected error:', err)
      return Response.json({ error: 'Internal server error.' }, { status: 500 })
    }
  },
}

export const exportSchemaTSEndpoint: Endpoint = {
  path: '/:id/export/ts',
  method: 'get',
  handler: async (req) => {
    const { user, payload } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let id = ''
    try {
      const urlObj = new URL(req.url || '')
      const parts = urlObj.pathname.split('/')
      const tsIdx = parts.indexOf('ts')
      if (tsIdx > 1) {
        id = parts[tsIdx - 2]
      }
    } catch (err) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (!id) {
      return Response.json({ error: 'Content Type ID is required' }, { status: 400 })
    }

    try {
      const doc = await payload.findByID({
        collection: 'content-types' as any,
        id,
        overrideAccess: true,
      })

      if (!doc) {
        return Response.json({ error: 'Content Type not found' }, { status: 404 })
      }

      // Enforce strict logical tenant isolation to prevent cross-tenant data leaks (Principle I)
      if ((user as any).role !== 'super-admin') {
        const tenantId = getPrimaryTenantId(user)
        if (!tenantId) {
          return Response.json(
            { error: 'User does not belong to a tenant.' },
            { status: 403 },
          )
        }
        const docTenantId = typeof doc.tenant === 'object' ? (doc.tenant as any)?.id : doc.tenant
        if (!docTenantId || String(docTenantId) !== String(tenantId)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      const tsContent = generatePayloadTS(doc.name, doc.slug, doc.schema?.fields || [])

      return new Response(tsContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${doc.name.replace(/\s+/g, '')}.ts"`,
        },
      })
    } catch (err) {
      console.error('[export-ts] Unexpected error:', err)
      return Response.json({ error: 'Internal server error.' }, { status: 500 })
    }
  },
}
