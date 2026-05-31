import { describe, beforeEach, it, expect } from '@jest/globals'
import { isRateLimited } from '../src/services/rate-limiter'


describe('Rate Limiter Service', () => {
  let createCalls: any[] = []

  const mockPayload: any = {
    find: async () => {
      return { docs: [] }
    },
    create: async (args: any) => {
      createCalls.push(args)
      return { id: 'new-id' }
    }
  }

  beforeEach(() => {
    createCalls = []
  })

  it('should return false if user is within the limit and record the request asynchronously', async () => {
    const limited = await isRateLimited('fresh-user', mockPayload)
    expect(limited).toBe(false)
    
    // Allow microtask queue to run for asynchronous payload.create to complete
    await new Promise(resolve => setTimeout(resolve, 20))
    
    expect(createCalls.length).toBe(1)
    expect(createCalls[0].data.userId).toBe('fresh-user')
    expect(createCalls[0].overrideAccess).toBe(true)
  })

  it('should return true if user has reached the 10 requests per minute limit', async () => {
    const userId = 'limited-user'
    // Make 10 requests which should all succeed
    for (let i = 0; i < 10; i++) {
      const limited = await isRateLimited(userId, mockPayload)
      expect(limited).toBe(false)
    }

    // The 11th request should be rate-limited
    const limited = await isRateLimited(userId, mockPayload)
    expect(limited).toBe(true)
  })

  it('should evict the oldest user when cache size exceeds 10000', async () => {
    // 1. Add first user 'oldest-user'
    await isRateLimited('oldest-user', mockPayload)

    // 2. Add 10000 other unique users to trigger eviction
    for (let i = 0; i < 10000; i++) {
      await isRateLimited(`user-${i}`, mockPayload)
    }

    // 3. Since cache size is capped at 10000, 'oldest-user' should have been evicted.
    // Querying it now should return false as it's treated as a fresh entry.
    const limited = await isRateLimited('oldest-user', mockPayload)
    expect(limited).toBe(false)
  })
})

