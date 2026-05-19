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
  const payload = await getPayload({ config })
  const { user } = await payload.auth(req)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting check (Consolidated 1 token for the whole batch)
  if (await isRateLimited(user.id, payload)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const { prompt, current_draft_json, content_schema, style_modifier_id } = await req.json()
  const tenantId = (user as any).tenants?.[0]?.tenant?.id || (user as any).tenants?.[0]?.tenant

  // For simplicity, we'll iterate through fields and refine them concurrently
  // but since we want to return a single compiled response, we'll use Promise.all
  
  const fieldsToRefine = Object.keys(current_draft_json)
  const authoringServiceUrl = process.env.CONTENT_AUTHORING_SERVICE_URL
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET

  try {
    const refinementPromises = fieldsToRefine.map(async (field) => {
      // Small optimization: only refine if prompt seems relevant? No, refine all as requested.
      const response = await fetch(`${authoringServiceUrl}/api/ai/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret as string,
        },
        body: JSON.stringify({
          prompt: `${prompt} (Focus on field: ${field})`,
          current_draft_json: { [field]: current_draft_json[field] },
          content_schema: content_schema,
          tenant_id: tenantId,
          user_id: user.id,
        }),
      })

      if (!response.ok) return { [field]: current_draft_json[field] } // Fallback to current

      // Parse the stream efficiently
      if (!response.body) return { [field]: current_draft_json[field] }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let resultData = null
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Keep the last line in the buffer as it might be incomplete
        buffer = lines.pop() || ''
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('event: REFINE_COMPLETE')) {
            const dataLine = lines[i + 1]
            if (dataLine && dataLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(dataLine.replace('data: ', ''))
                if (parsed.draft && parsed.draft[field]) {
                  resultData = parsed.draft[field]
                }
              } catch (e) {
                console.error("Failed to parse REFINE_COMPLETE data", e)
              }
            }
          }
        }
      }

      return { [field]: resultData || current_draft_json[field] }
    })

    const results = await Promise.all(refinementPromises)
    const combinedDraft = results.reduce((acc, curr) => ({ ...acc, ...curr }), {})

    return NextResponse.json({ draft: combinedDraft })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
