import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited } from '@/services/rate-limiter'

/**
 * POST /api/ai/refine-all
 * Parallel Refinement Orchestrator.
 * Satisfies T029b.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth(req)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting check (Consolidated 1 token for the whole batch)
  if (await isRateLimited(String(user.id), payload)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const { prompt, current_draft_json, content_schema, style_modifier_id } = await req.json()
  const tenantId = (user as any).tenants?.[0]?.tenant?.id || (user as any).tenants?.[0]?.tenant

  // Load style modifier prompt if provided
  let styleModifierPrompt = null
  if (style_modifier_id) {
    const styleModifier = await payload.findByID({
      collection: 'style-modifiers',
      id: style_modifier_id,
      req,
    })
    styleModifierPrompt = styleModifier?.systemPrompt
  }

  // For simplicity, we'll iterate through fields and refine them concurrently
  // but since we want to return a single compiled response, we'll use Promise.all
  
  const fieldsToRefine = Object.keys(current_draft_json)
  const authoringServiceUrl = process.env.CONTENT_AUTHORING_SERVICE_URL
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET
  
  const abortController = new AbortController()
  req.signal.addEventListener('abort', () => {
    console.log('[AI Proxy] Refine All: Client disconnected, aborting parallel requests.')
    abortController.abort()
  })

  try {
    const refinementPromises = fieldsToRefine.map(async (field) => {
      // Small optimization: only refine if prompt seems relevant? No, refine all as requested.
      const response = await fetch(`${authoringServiceUrl}/api/ai/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret as string,
        },
        signal: abortController.signal,
        body: JSON.stringify({
          prompt: `${prompt} (Focus on field: ${field})`,
          current_draft_json: { [field]: current_draft_json[field] },
          content_schema: content_schema,
          tenant_id: tenantId,
          user_id: user.id,
          style_modifier_prompt: styleModifierPrompt,
        }),
      })

      if (!response.ok) return { field, error: `Failed with status ${response.status}`, data: { [field]: current_draft_json[field] } }

      // Parse the stream efficiently
      if (!response.body) return { field, error: 'No response body', data: { [field]: current_draft_json[field] } }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let resultData = null
      let buffer = ''
      let parseError = null

      let promptTokens = 0
      let completionTokens = 0
      let totalTokens = 0
      let estimatedCost = 0

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          
          // Keep the last line in the buffer as it might be incomplete
          buffer = lines.pop() || ''
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (line.startsWith('event: REFINE_COMPLETE')) {
              const dataLine = lines[i + 1]
              if (dataLine && dataLine.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(dataLine.replace('data: ', ''))
                  if (parsed.draft && parsed.draft[field]) {
                    resultData = parsed.draft[field]
                  }
                  if (parsed.usage_metadata) {
                    promptTokens = parsed.usage_metadata.input_tokens || promptTokens
                    completionTokens = parsed.usage_metadata.output_tokens || completionTokens
                    totalTokens = parsed.usage_metadata.total_tokens || (promptTokens + completionTokens)
                    estimatedCost = parsed.usage_metadata.cost_microdollars || estimatedCost
                  }
                } catch (e) {
                  parseError = "Failed to parse REFINE_COMPLETE data"
                }
              }
            } else if (line.startsWith('event: ERROR')) {
              const dataLine = lines[i + 1]
              if (dataLine && dataLine.startsWith('data: ')) {
                parseError = dataLine.replace('data: ', '')
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          parseError = 'Aborted'
        } else {
          parseError = err.message
        }
      }

      return { 
        field, 
        error: parseError || (!resultData ? 'No draft data returned' : null), 
        data: { [field]: resultData || current_draft_json[field] },
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost
      }
    })

    const results = await Promise.all(refinementPromises)
    const combinedDraft = results.reduce((acc, curr) => ({ ...acc, ...curr.data }), {})
    const errors = results.filter(r => r.error).map(r => ({ field: r.field, error: r.error }))
    
    // Aggregate tokens and costs
    let totalPromptTokens = 0
    let totalCompletionTokens = 0
    let totalAllTokens = 0
    let totalCostMicrodollars = 0
    results.forEach(r => {
      totalPromptTokens += (r as any).promptTokens || 0
      totalCompletionTokens += (r as any).completionTokens || 0
      totalAllTokens += (r as any).totalTokens || 0
      totalCostMicrodollars += (r as any).estimatedCost || 0
    })

    const resolvedModel = (await payload.findByID({ collection: 'tenants', id: tenantId })).defaultLLMModel || 'openai/gpt-4o'
    const [modelProvider, modelName] = resolvedModel.split('/')

    // Write aggregated audit log
    await payload.create({
      collection: 'ai-audit-logs',
      data: {
        user: user.id,
        tenant: tenantId,
        requestType: 'refine',
        prompt: `Refine All: ${prompt}`,
        model: modelName || modelProvider,
        provider: modelProvider,
        status: errors.length === fieldsToRefine.length ? 'error' : 'success',
        durationMs: Date.now() - startTime,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalAllTokens,
        estimatedCost: totalCostMicrodollars,
        styleModifier: style_modifier_id,
      } as any,
      overrideAccess: true,
    })


    const responsePayload: any = { draft: combinedDraft }
    if (errors.length > 0) {
      responsePayload.errors = errors
    }

    return NextResponse.json(responsePayload)
  } catch (err: any) {
    // Log error if everything failed
    await payload.create({
      collection: 'ai-audit-logs',
      data: {
        user: user.id,
        tenant: tenantId,
        requestType: 'refine',
        prompt: `Refine All (FAILED): ${prompt}`,
        model: 'unknown',
        provider: 'unknown',
        status: 'error',
        errorMessage: err.message,
        durationMs: Date.now() - startTime,
        styleModifier: style_modifier_id,
      } as any,
      overrideAccess: true,
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
