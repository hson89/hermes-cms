import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited } from '@/services/rate-limiter'

/**
 * POST /api/ai/refine
 * SSE Proxy to Content Authoring Service for refinement with Audit Logging.
 * Satisfies T028, FR-012.
 */
export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth(req)

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Rate limiting check
  if (await isRateLimited(user.id, payload)) {
    return new Response('Too Many Requests', { status: 429 })
  }

  const body = await req.json()
  const tenantId = (user as any).tenants?.[0]?.tenant?.id || (user as any).tenants?.[0]?.tenant

  const authoringServiceUrl = process.env.CONTENT_AUTHORING_SERVICE_URL
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET

  const startTime = Date.now()

  const response = await fetch(`${authoringServiceUrl}/api/ai/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': internalSecret as string,
    },
    body: JSON.stringify({
      ...body,
      tenant_id: tenantId,
      user_id: user.id,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    // Log error to Audit Logs
    await payload.create({
      collection: 'ai-audit-logs',
      data: {
        user: user.id,
        tenant: tenantId,
        requestType: 'refine',
        prompt: body.prompt,
        model: body.modelOverride || 'unknown',
        provider: body.modelOverride?.split('/')[0] || 'unknown',
        status: 'error',
        errorMessage: error,
        durationMs: Date.now() - startTime,
      },
      overrideAccess: true,
    })
    return new Response(error, { status: response.status })
  }

  const stream = response.body
  if (!stream) {
    return new Response('No response body', { status: 500 })
  }

  // Use TransformStream to monitor stream and log on finish
  const [modelProvider, modelName] = (body.modelOverride || 'openai/gpt-4o').split('/')

  let promptTokens = 0
  let completionTokens = 0
  let totalTokens = 0

  const loggingStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk)
      if (text.includes('"usage_metadata"')) {
        try {
          const match = text.match(/"usage_metadata":\s*({[^}]+})/)
          if (match) {
            const usage = JSON.parse(match[1])
            promptTokens = usage.input_tokens || 0
            completionTokens = usage.output_tokens || 0
            totalTokens = usage.total_tokens || (promptTokens + completionTokens)
          }
        } catch (e) {
          console.error("Failed to parse usage metadata", e)
        }
      }
      controller.enqueue(chunk)
    },
    async flush() {
      await payload.create({
        collection: 'ai-audit-logs',
        data: {
          user: user.id,
          tenant: tenantId,
          session: body.sessionId,
          requestType: 'refine',
          prompt: body.prompt,
          model: modelName || modelProvider,
          provider: modelProvider,
          status: 'success',
          durationMs: Date.now() - startTime,
          promptTokens,
          completionTokens,
          totalTokens,
        },
        overrideAccess: true,
      })
    }
  })

  return new Response(stream.pipeThrough(loggingStream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
