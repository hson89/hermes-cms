import { BasePayload } from 'payload'

/**
 * Checks if a user has exceeded the rate limit of 10 requests per minute globally.
 * Uses the AIRateLimits collection with overrideAccess: true to bypass tenant scoping.
 */
export async function isRateLimited(userId: string, payload: BasePayload): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()

  // Find requests from this user in the last minute
  const result = await payload.find({
    collection: 'ai-rate-limits',
    where: {
      and: [
        {
          userId: {
            equals: userId,
          },
        },
        {
          timestamp: {
            greater_than_equal: oneMinuteAgo,
          },
        },
      ],
    },
    overrideAccess: true, // Bypass tenant isolation for global user limit
    pagination: false,
    limit: 11, // Optimization: only need to know if it's >= 10
  })

  if (result.docs.length >= 10) {
    return true
  }

  // Record the current request
  await payload.create({
    collection: 'ai-rate-limits',
    data: {
      userId,
      timestamp: new Date().toISOString(),
      requestPath: 'internal-proxy',
    },
    overrideAccess: true,
  })

  return false
}
