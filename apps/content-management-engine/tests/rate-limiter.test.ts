import { isRateLimited } from '../src/services/rate-limiter'

describe('Rate Limiter Service', () => {
  let findCalls: any[] = []
  let createCalls: any[] = []

  const mockPayload: any = {
    find: async (args: any) => {
      findCalls.push(args)
      if (args.collection === 'ai-rate-limits') {
        // Mock finding 10 requests in the last 60 seconds
        const userIdFilter = args.where?.and?.find((f: any) => f.userId)?.userId?.equals
        if (userIdFilter === 'limited-user') {
          return { docs: new Array(10).fill({}) }
        }
      }
      return { docs: [] }
    },
    create: async (args: any) => {
      createCalls.push(args)
      return { id: 'new-id' }
    }
  }

  beforeEach(() => {
    findCalls = []
    createCalls = []
  })

  it('should return true if user has reached the 10 requests per minute limit', async () => {
    const limited = await isRateLimited('limited-user', mockPayload)
    expect(limited).toBe(true)
    expect(findCalls[0].overrideAccess).toBe(true) // Ensure it bypasses tenant scoping
  })

  it('should return false if user is within the limit and record the request', async () => {
    const limited = await isRateLimited('fresh-user', mockPayload)
    expect(limited).toBe(false)
    expect(createCalls.length).toBe(1)
    expect(createCalls[0].data.userId).toBe('fresh-user')
    expect(createCalls[0].overrideAccess).toBe(true)
  })
})
