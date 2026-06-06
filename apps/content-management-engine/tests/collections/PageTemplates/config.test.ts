import { jest, describe, it, expect } from '@jest/globals'

// Mock langfuse service to prevent any execution side-effects during config loading
jest.mock('../../../src/services/langfuse', () => ({
  langfuse: null,
}))

import { pageTemplateAccess } from '../../../src/collections/PageTemplates'
import configPromise from '../../../src/payload.config'

describe('PageTemplates Collection Access Control and Config', () => {
  describe('pageTemplateAccess.read', () => {
    it('should return true for super-admin user', async () => {
      const mockReq: any = {
        user: {
          id: 'user-admin',
          role: 'super-admin',
        },
      }
      const result = await pageTemplateAccess.read({ req: mockReq } as any)
      expect(result).toBe(true)
    })

    it('should return false if there is no user', async () => {
      const mockReq: any = {
        user: null,
      }
      const result = await pageTemplateAccess.read({ req: mockReq } as any)
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
      const result = await pageTemplateAccess.read({ req: mockReq } as any)
      expect(result).toBe(false)
    })

    it('should return combined query permitting assigned tenant templates OR global templates', async () => {
      const mockReq: any = {
        user: {
          id: 'user-123',
          role: 'tenant-admin',
          tenants: [
            {
              tenant: 384,
            },
          ],
        },
      }
      const result: any = await pageTemplateAccess.read({ req: mockReq } as any)
      expect(result).toEqual({
        or: [
          {
            tenant: {
              in: [384],
            },
          },
          {
            isGlobal: {
              equals: true,
            },
          },
        ],
      })
    })
  })

  describe('payload.config.ts Multi-Tenant Configuration', () => {
    it('should configure page-templates to bypass default tenant access control and base filters', async () => {
      const config = await configPromise
      const pageTemplatesColl = config.collections?.find(
        (c: any) => c.slug === 'page-templates',
      )

      expect(pageTemplatesColl).toBeDefined()
      
      // If useTenantAccess: false is configured, the read access function will be exactly our custom one, not wrapped
      expect(pageTemplatesColl?.access?.read).toBe(pageTemplateAccess.read)
      expect(pageTemplatesColl?.access?.create).toBe(pageTemplateAccess.create)
      expect(pageTemplatesColl?.access?.update).toBe(pageTemplateAccess.update)
      expect(pageTemplatesColl?.access?.delete).toBe(pageTemplateAccess.delete)

      // If useBaseFilter/useBaseListFilter: false is configured, no baseFilter will be added to the admin config
      expect(pageTemplatesColl?.admin?.baseFilter).toBeUndefined()
    })
  })
})
