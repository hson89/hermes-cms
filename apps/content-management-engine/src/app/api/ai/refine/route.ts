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

  // Load style modifier prompt if provided
  let styleModifierPrompt = null
  if (body.style_modifier_id) {
    const styleModifier = await payload.findByID({
      collection: 'style-modifiers',
      id: body.style_modifier_id,
      req,
    })
    styleModifierPrompt = styleModifier?.systemPrompt
  }

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
      style_modifier_prompt: styleModifierPrompt,
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
        styleModifier: body.style_modifier_id,
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
  const resolvedModel = body.modelOverride || (await payload.findByID({ collection: 'tenants', id: tenantId })).defaultLLMModel || 'openai/gpt-4o'
  const [modelProvider, modelName] = resolvedModel.split('/')

  let promptTokens = 0
  let completionTokens = 0
  let buffer = ''
  const decoder = new TextDecoder()
  const loggingStream = new TransformStream({
    transform(chunk, controller) {
      // Decode chunk and add to buffer
      buffer += decoder.decode(chunk, { stream: true })
      
      // Split by newlines to process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep last partial line in buffer

      for (const line of lines) {
        if (line.includes('"usage_metadata"')) {
          try {
            const match = line.match(/"usage_metadata":\s*({[^}]+})/)
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
          styleModifier: body.style_modifier_id,
        },
        overrideAccess: true,
      })
    },
    async cancel(reason) {
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
          status: 'error',
          errorMessage: `Stream cancelled: ${reason}`,
          durationMs: Date.now() - startTime,
          promptTokens,
          completionTokens,
          totalTokens,
          styleModifier: body.style_modifier_id,
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
