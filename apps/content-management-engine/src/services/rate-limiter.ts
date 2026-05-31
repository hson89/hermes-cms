import { BasePayload } from 'payload'

// Safe in-memory sliding-window cache for high performance
const userRequestCache = new Map<string, number[]>()

// Cleanup interval to prune completely idle users from memory
if (typeof global !== 'undefined') {
  const intervalId = (global as any)._rateLimiterPruneInterval
  if (intervalId) {
    clearInterval(intervalId)
  }
  ;(global as any)._rateLimiterPruneInterval = setInterval(() => {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    userRequestCache.forEach((timestamps, userId) => {
      const active = timestamps.filter((ts: number) => ts > oneMinuteAgo)
      if (active.length === 0) {
        userRequestCache.delete(userId)
      } else {
        userRequestCache.set(userId, active)
      }
    })
  }, 30000)
}

/**
 * Checks if a user has exceeded the rate limit of 10 requests per minute globally.
 * Highly optimized non-blocking in-memory cache to prevent Postgres saturation.
 */
export async function isRateLimited(userId: string, payload: BasePayload): Promise<boolean> {
  const now = Date.now()
  const oneMinuteAgo = now - 60 * 1000

  // 1. Get user request timestamps
  const timestamps = userRequestCache.get(userId) || []

  // 2. Filter out expired timestamps (> 1 minute old)
  const recentTimestamps = timestamps.filter((ts: number) => ts > oneMinuteAgo)

  if (recentTimestamps.length >= 10) {
    return true
  }

  // 3. Record the current request timestamp
  recentTimestamps.push(now)
  userRequestCache.set(userId, recentTimestamps)

  // 4. Asynchronously log the request to the database out-of-band so we don't block the request path!
  payload.create({
    collection: 'ai-rate-limits',
    data: {
      userId,
      timestamp: new Date().toISOString(),
      requestPath: 'internal-proxy',
    },
    overrideAccess: true,
  }).catch((err) => {
    console.error('[RateLimiter] Asynchronous database log failed:', err)
  })

  return false
}
