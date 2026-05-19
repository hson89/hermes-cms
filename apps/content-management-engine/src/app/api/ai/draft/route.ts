import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited } from '@/services/rate-limiter'

/**
 * POST /api/ai/draft
 * SSE Proxy to Content Authoring Service with Audit Logging.
 * Satisfies T019, FR-012.
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
    })
    styleModifierPrompt = styleModifier?.systemPrompt
  }

  // Load active tenant's default LLM model if not provided
  if (!body.modelOverride) {
    const tenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
    })
    body.modelOverride = tenant.defaultLLMModel
  }

  const authoringServiceUrl = process.env.CONTENT_AUTHORING_SERVICE_URL
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET

  const startTime = Date.now()

  const response = await fetch(`${authoringServiceUrl}/api/ai/draft`, {
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
        requestType: 'draft',
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
      // Decode chunk to string if it's Uint8Array to inspect it
      // Since it's a web stream from fetch, chunk is Uint8Array
      const text = new TextDecoder().decode(chunk)
      
      // Look for a metadata event or similar that LangChain might send
      // Example: event: METADATA\ndata: {"usage_metadata": {"input_tokens": 10, "output_tokens": 20}}
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
      
      // Pass the chunk through unchanged
      controller.enqueue(chunk)
    },
    async flush() {
      // Log successful completion
      await payload.create({
        collection: 'ai-audit-logs',
        data: {
          user: user.id,
          tenant: tenantId,
          session: body.sessionId,
          requestType: 'draft',
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
