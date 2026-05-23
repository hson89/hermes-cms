import type { Endpoint } from 'payload'
import { getPrimaryTenantId } from '../Users/utils'
import { langfuse } from '../../services/langfuse'
import type { Langfuse } from 'langfuse'

/**
 * T022 - Implement POST /api/ai/copilot/edit endpoint
 * This endpoint acts as a proxy to the FastAPI AI microservice.
 * It takes a specific section of content, the user's prompt, and asks the AI to edit it.
 */
export const copilotEditEndpoint: Endpoint = {
  path: '/api/ai/copilot/edit',
  method: 'post',
  handler: async (req) => {
    let trace: ReturnType<Langfuse['trace']> | undefined = undefined
    try {
      const user = req.user
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = (req.json ? await req.json() : req.data) || {}
      const { contentItemId, sectionId, prompt } = body

      if (!contentItemId || !sectionId || !prompt) {
        return Response.json(
          { error: 'Missing required fields: contentItemId, sectionId, prompt' },
          { status: 400 },
        )
      }

      const tenantId = getPrimaryTenantId(user)

      // Initialize Langfuse Trace
      trace = langfuse?.trace({
        name: 'copilot-edit',
        userId: String(user.id),
        metadata: {
          tenantId: String(tenantId),
          contentItemId,
          sectionId,
        },
        input: { prompt },
      })

      // Proxy request to the Content Authoring microservice
      const contentAuthoringServiceUrl =
        process.env.CONTENT_AUTHORING_SERVICE_URL ??
        process.env.AI_SERVICE_URL ??
        'http://localhost:8000'
      const internalSecret = process.env.INTERNAL_SERVICE_SECRET ?? ''

      const response = await fetch(`${contentAuthoringServiceUrl}/api/ai/copilot/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret,
        },
        body: JSON.stringify({
          content_item_id: contentItemId,
          section_id: sectionId,
          prompt,
          tenant_id: tenantId,
          user_id: user.id,
          langfuse_trace_id: trace?.id,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI Service Copilot Error:', errorText)
        trace?.update({
          output: { error: errorText },
        })
        return Response.json(
          { error: 'AI microservice failed to process the request' },
          { status: response.status },
        )
      }

      const data = await response.json()
      trace?.update({
        output: { data },
      })
      return Response.json(data)
    } catch (error) {
      console.error('Copilot edit endpoint error:', error)
      trace?.update({
        output: { error: String(error) },
      })
      return Response.json({ error: 'Internal Server Error' }, { status: 500 })
    } finally {
      if (langfuse) {
        await langfuse.flushAsync()
      }
    }
  },
}
