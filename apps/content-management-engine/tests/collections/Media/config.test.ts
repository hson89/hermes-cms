import { jest, describe, it, expect } from '@jest/globals'

// Mock langfuse service to prevent any execution side-effects during config loading
jest.mock('../../../src/services/langfuse', () => ({
  langfuse: null,
}))

import { mediaAccess } from '../../../src/collections/Media'
import configPromise from '../../../src/payload.config'

describe('Media Collection Access Control and Config', () => {
  describe('mediaAccess.read', () => {
    it('should return true for super-admin user', async () => {
      const mockReq: any = {
        user: {
          id: 'user-admin',
          role: 'super-admin',
        },
      }
      const result = await mediaAccess.read({ req: mockReq } as any)
      expect(result).toBe(true)
    })

    it('should return global media filter if there is no user', async () => {
      const mockReq: any = {
        user: null,
      }
      const result = await mediaAccess.read({ req: mockReq } as any)
      expect(result).toEqual({
        tenant: {
          equals: null,
        },
      })
    })

    it('should return global media filter if user has no assigned tenants', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [],
        },
      }
      const result = await mediaAccess.read({ req: mockReq } as any)
      expect(result).toEqual({
        tenant: {
          equals: null,
        },
      })
    })

    it('should return combined query permitting assigned tenant media OR global media', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [
            {
              tenant: 'tenant-1',
            },
          ],
        },
      }
      const result: any = await mediaAccess.read({ req: mockReq } as any)
      expect(result).toEqual({
        or: [
          {
            tenant: {
              in: ['tenant-1'],
            },
          },
          {
            tenant: {
              equals: null,
            },
          },
        ],
      })
    })
  })

  describe('mediaAccess.create', () => {
    it('should return true for super-admin user', async () => {
      const mockReq: any = {
        user: {
          id: 'user-admin',
          role: 'super-admin',
        },
      }
      const result = await mediaAccess.create({ req: mockReq } as any)
      expect(result).toBe(true)
    })

    it('should return false if there is no user', async () => {
      const mockReq: any = {
        user: null,
      }
      const result = await mediaAccess.create({ req: mockReq } as any)
      expect(result).toBe(false)
    })

    it('should return false if user has no assigned tenants', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [],
        },
      }
      const result = await mediaAccess.create({ req: mockReq } as any)
      expect(result).toBe(false)
    })

    it('should return tenant filter permitting creation only for assigned tenants', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [
            {
              tenant: 'tenant-1',
            },
          ],
        },
      }
      const result = await mediaAccess.create({ req: mockReq } as any)
      expect(result).toEqual({
        tenant: {
          in: ['tenant-1'],
        },
      })
    })
  })

  describe('mediaAccess.update', () => {
    it('should return true for super-admin user', async () => {
      const mockReq: any = {
        user: {
          id: 'user-admin',
          role: 'super-admin',
        },
      }
      const result = await mediaAccess.update({ req: mockReq } as any)
      expect(result).toBe(true)
    })

    it('should return false if there is no user', async () => {
      const mockReq: any = {
        user: null,
      }
      const result = await mediaAccess.update({ req: mockReq } as any)
      expect(result).toBe(false)
    })

    it('should return false if user has no assigned tenants', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [],
        },
      }
      const result = await mediaAccess.update({ req: mockReq } as any)
      expect(result).toBe(false)
    })

    it('should return tenant filter permitting update only for assigned tenants', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [
            {
              tenant: 'tenant-1',
            },
          ],
        },
      }
      const result = await mediaAccess.update({ req: mockReq } as any)
      expect(result).toEqual({
        tenant: {
          in: ['tenant-1'],
        },
      })
    })
  })

  describe('mediaAccess.delete', () => {
    it('should return true for super-admin user', async () => {
      const mockReq: any = {
        user: {
          id: 'user-admin',
          role: 'super-admin',
        },
      }
      const result = await mediaAccess.delete({ req: mockReq } as any)
      expect(result).toBe(true)
    })

    it('should return false if there is no user', async () => {
      const mockReq: any = {
        user: null,
      }
      const result = await mediaAccess.delete({ req: mockReq } as any)
      expect(result).toBe(false)
    })

    it('should return false if user has no assigned tenants', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [],
        },
      }
      const result = await mediaAccess.delete({ req: mockReq } as any)
      expect(result).toBe(false)
    })

    it('should return tenant filter permitting deletion only for assigned tenants', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [
            {
              tenant: 'tenant-1',
            },
          ],
        },
      }
      const result = await mediaAccess.delete({ req: mockReq } as any)
      expect(result).toEqual({
        tenant: {
          in: ['tenant-1'],
        },
      })
    })
  })

  describe('payload.config.ts Multi-Tenant Configuration', () => {
    it('should configure media to bypass default tenant access control and base filters', async () => {
      const config = await configPromise
      const mediaColl = config.collections?.find(
        (c: any) => c.slug === 'media',
      )

      expect(mediaColl).toBeDefined()
      expect(mediaColl?.access?.read).toBe(mediaAccess.read)
      expect(mediaColl?.access?.create).toBe(mediaAccess.create)
      expect(mediaColl?.access?.update).toBe(mediaAccess.update)
      expect(mediaColl?.access?.delete).toBe(mediaAccess.delete)

      expect(mediaColl?.admin?.baseFilter).toBeUndefined()
    })
  })
})
