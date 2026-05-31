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
})
