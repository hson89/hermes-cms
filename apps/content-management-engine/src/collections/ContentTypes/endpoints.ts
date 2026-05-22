import type { Endpoint, PayloadRequest } from 'payload'
import { getPrimaryTenantId } from '../Users/utils'
import { generatePayloadTS } from '../../services/export-service'
import { langfuse } from '../../services/langfuse'

/**
 * Resolves the primary tenant ID for a user.
 * For global super-admins who don't belong to any tenant, it fetches the first
 * active tenant in the system as a fallback to isolate the AI session.
 */
async function resolveTenantId(user: any, payload: any): Promise<string | number | undefined> {
  if (!user) return undefined
  
  console.log(`[resolveTenantId] Resolving for user ${user.id} (${user.role})`)
  
  // 1. Try to get primary tenant from utility (handles tenants array and legacy fields)
  let tenantId = getPrimaryTenantId(user)
  
  // 2. Fallback for Super Admin: use the first tenant in the system to isolate the AI session
  if (!tenantId && user.role === 'super-admin') {
    try {
      const tenants = await payload.find({
        collection: 'tenants',
        limit: 1,
        overrideAccess: true,
      })
      if (tenants.docs.length > 0) {
        tenantId = tenants.docs[0].id
        console.log(`[resolveTenantId] Fallback for Super Admin to tenant ${tenantId}`)
      }
    } catch (err) {
      console.error('[resolveTenantId] Failed to resolve fallback tenant for super-admin:', err)
    }
  }
  
  if (tenantId) {
    console.log(`[resolveTenantId] Resolved to tenant ${tenantId}`)
  } else {
    console.warn(`[resolveTenantId] Could not resolve tenant for user ${user.id}`)
  }
  
  return tenantId
}

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
    console.log('--- GENERATE SCHEMA ENDPOINT ---')
    console.log('User ID:', user?.id)

    if (!user) {
      console.log('Unauthorized: No user found in request.')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await resolveTenantId(user, payload)
    if (!tenantId) {
      console.log('Forbidden: Tenant ID could not be resolved for user.')
      return Response.json(
        { error: 'User does not belong to a tenant.' },
        { status: 403 },
      )
    }

    let body: { prompt?: string; currentSchema?: any }
    try {
      body = await (req as unknown as Request).json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { prompt, currentSchema } = body
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return Response.json({ error: 'prompt is required.' }, { status: 400 })
    }

    // Initialize Langfuse Trace
    const trace = langfuse?.trace({
      name: 'generate-schema',
      userId: String(user.id),
      metadata: {
        tenantId: String(tenantId),
        hasCurrentSchema: !!currentSchema,
      },
      input: { prompt },
    })

    try {
      // Dispatch to Content Authoring Microservice
      const contentAuthoringServiceUrl =
        process.env.CONTENT_AUTHORING_SERVICE_URL ??
        process.env.AI_SERVICE_URL ??
        'http://localhost:8000'
      const response = await fetch(`${contentAuthoringServiceUrl}/api/ai/generate-schema`, {
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
          current_schema: currentSchema || null,
          langfuse_trace_id: trace?.id,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[generate-schema] AI service error:', errorBody)
        trace?.update({
          output: { error: errorBody },
        })
        return Response.json(
          { error: 'AI service failed to process request.' },
          { status: 502 },
        )
      }

      const result = await response.json()
      trace?.update({
        output: {
          sessionId: result.sessionId || result.session_id,
          status: result.status,
        },
      })

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
      trace?.update({
        output: { error: String(err) },
      })
      return Response.json(
        { error: 'Internal server error.' },
        { status: 500 },
      )
    } finally {
      if (langfuse) {
        await langfuse.flushAsync()
      }
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
    const { user, payload } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await resolveTenantId(user, payload)
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
      const contentAuthoringServiceUrl =
        process.env.CONTENT_AUTHORING_SERVICE_URL ??
        process.env.AI_SERVICE_URL ??
        'http://localhost:8000'
      const response = await fetch(`${contentAuthoringServiceUrl}/api/ai/sessions/${sessionId}`, {
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

/**
 * Custom endpoint: POST /api/content-types/sessions/:id/message
 *
 * Proxies messages to the AI Agent session, streaming SSE tokens back to the user.
 */
export const postSessionMessageEndpoint: Endpoint = {
  path: '/sessions/:id/message',
  method: 'post',
  handler: async (req) => {
    const { user, payload } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await resolveTenantId(user, payload)
    if (!tenantId) {
      return Response.json(
        { error: 'User does not belong to a tenant.' },
        { status: 403 },
      )
    }

    // Extract session ID securely from the req.url (e.g. /api/content-types/sessions/:id/message)
    let sessionId = ''
    try {
      const urlObj = new URL(req.url || '')
      const parts = urlObj.pathname.split('/')
      const sessIdx = parts.indexOf('sessions')
      if (sessIdx !== -1 && sessIdx + 1 < parts.length) {
        sessionId = parts[sessIdx + 1]
      }
    } catch (err) {
      return Response.json({ error: 'Invalid request URL.' }, { status: 400 })
    }

    if (!sessionId) {
      return Response.json({ error: 'Session ID is required.' }, { status: 400 })
    }

    let body: { prompt?: string; currentSchema?: any }
    try {
      body = await (req as unknown as Request).json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { prompt, currentSchema } = body
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return Response.json({ error: 'prompt is required.' }, { status: 400 })
    }

    // Initialize Langfuse Trace
    const trace = langfuse?.trace({
      name: 'session-message',
      userId: String(user.id),
      metadata: {
        sessionId,
        hasCurrentSchema: !!currentSchema,
      },
      input: { prompt },
    })

    try {
      const contentAuthoringServiceUrl =
        process.env.CONTENT_AUTHORING_SERVICE_URL ??
        process.env.AI_SERVICE_URL ??
        'http://localhost:8000'
      const response = await fetch(`${contentAuthoringServiceUrl}/api/ai/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SERVICE_SECRET ?? '',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          current_schema: currentSchema || null,
          langfuse_trace_id: trace?.id,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('[session-message] AI service streaming error:', errorBody)
        trace?.update({
          output: { error: errorBody },
        })
        return Response.json(
          { error: 'AI service failed to initiate stream.' },
          { status: response.status },
        )
      }

      // Proxy the streaming body using a custom ReadableStream with logging
      console.log(`[session-message-stream] Handshake OK, starting stream proxy for session ${sessionId}`)

      const reader = response.body?.getReader()
      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            console.warn('[session-message-stream] No reader found on AI service response body.')
            controller.close()
            return
          }
          try {
            const decoder = new TextDecoder('utf-8')
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                console.log('[session-message-stream] Stream reached EOF.')
                break
              }
              const chunkStr = decoder.decode(value, { stream: true })
              console.log(`[session-message-stream] Received ${value.length} bytes from AI service:`, chunkStr)
              controller.enqueue(value)
            }
          } catch (err) {
            console.error('[session-message-stream] Error reading from AI service stream:', err)
          } finally {
            controller.close()
          }
        }
      })

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    } catch (err) {
      console.error('[session-message] Unexpected error:', err)
      trace?.update({
        output: { error: String(err) },
      })
      return Response.json(
        { error: 'Internal server error.' },
        { status: 500 },
      )
    } finally {
      if (langfuse) {
        await langfuse.flushAsync()
      }
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

/**
 * Custom endpoint: GET /api/content-types/collections-list
 *
 * Securely lists all registered collection slugs in the Payload monolith instance.
 * Exposes dynamic relationship target options dynamically to the canvas editor UI.
 */
export const listCollectionsEndpoint: Endpoint = {
  path: '/collections-list',
  method: 'get',
  handler: async (req) => {
    const { user, payload } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const collections = Object.keys(payload.collections).map((slug) => ({
        slug,
        label: (payload.collections as any)[slug].config.labels?.plural || slug,
      }))

      return Response.json({ collections })
    } catch (err) {
      console.error('[collections-list] Unexpected error:', err)
      return Response.json({ error: 'Failed to list collections.' }, { status: 500 })
    }
  },
}
