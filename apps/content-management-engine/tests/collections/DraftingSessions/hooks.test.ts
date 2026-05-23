import { validateLockHook } from '../../../src/collections/DraftingSessions/hooks/validateLock'
import { capVersionsHook } from '../../../src/collections/DraftingSessions/hooks/capVersions'

describe('DraftingSessions Collection Hooks', () => {
  describe('validateLockHook', () => {
    let findCalls: any[] = []
    let findResults: any[] = []

    const mockPayload: any = {
      find: async (args: any) => {
        findCalls.push(args)
        return findResults.shift() || { docs: [] }
      },
      update: async (args: any) => {
        return { id: args.id }
      },
    }

    const mockReq: any = {
      payload: mockPayload,
    }

    beforeEach(() => {
      findCalls = []
      findResults = []
    })

    it('should reject if an active lock exists for the same tenant and content type', async () => {
      findResults = [
        { docs: [{ id: 'active-session-id', status: 'active', lastActivityAt: new Date().toISOString() }] }
      ]

      const data = {
        tenant: 'tenant-1',
        contentType: 'ct-1',
        status: 'active'
      }

      await expect(
        validateLockHook({
          data,
          req: mockReq,
          operation: 'create',
        })
      ).rejects.toThrow('A drafting session is already in progress for this content type.')
    })

    it('should allow if the existing lock is older than 10 minutes (expired on-the-fly)', async () => {
      const tenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000)
      findResults = [
        { docs: [{ id: 'old-session-id', status: 'active', lastActivityAt: tenMinutesAgo.toISOString() }] }
      ]

      const data = {
        tenant: 'tenant-1',
        contentType: 'ct-1',
        status: 'active'
      }

      const result = await validateLockHook({
        data,
        req: mockReq,
        operation: 'create',
      })

      expect(result).toBe(data)
    })

    it('should allow if an active lock exists for a DIFFERENT tenant', async () => {
      findResults = [
        { docs: [] } // In real usage, find filtered by tenant-1 would return 0 docs even if tenant-2 has one
      ]

      const data = {
        tenant: 'tenant-1',
        contentType: 'ct-1',
        status: 'active'
      }

      const result = await validateLockHook({
        data,
        req: mockReq,
        operation: 'create',
      })

      expect(result).toBe(data)
      expect(findCalls[0].where.and).toContainEqual({ tenant: { equals: 'tenant-1' } })
    })
  })

  describe('capVersionsHook', () => {
    it('should trim versions to keep only the last 10', async () => {
      const versions = new Array(15).fill(0).map((_, i) => ({ timestamp: new Date(), draftData: { i } }))
      const data = {
        versions
      }

      const result = await capVersionsHook({
        data,
      })

      expect(result.versions.length).toBe(10)
      expect(result.versions[0].draftData.i).toBe(5) // The 6th item becomes the first
    })
  })
})
