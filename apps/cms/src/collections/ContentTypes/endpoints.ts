import type { Endpoint, PayloadRequest } from 'payload'

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
    const { user } = req

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.tenantId) {
      return Response.json(
        { error: 'User does not belong to a tenant.' },
        { status: 403 },
      )
    }

    let body: { prompt?: string }
    try {
      // PayloadRequest extends the web Request – .json() is available at runtime
      body = await (req as unknown as Request).json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { prompt } = body
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return Response.json({ error: 'prompt is required.' }, { status: 400 })
    }

    const tenantId =
      typeof user.tenantId === 'object' ? user.tenantId.id : user.tenantId

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
          tenantId,
          userId: user.id,
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

      return Response.json(
        {
          message: 'Schema generation initiated.',
          sessionId: result.sessionId,
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
