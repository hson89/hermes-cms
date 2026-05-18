import { jest } from '@jest/globals'
import { TenantService } from '../tenant-service'
import { BasePayload } from 'payload'

describe('TenantService', () => {
  let tenantService: TenantService
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      find: jest.fn().mockResolvedValue({ docs: [] }),
      create: jest.fn().mockResolvedValue({}),
    }
    tenantService = new TenantService(mockPayload as unknown as BasePayload)
  })

  describe('validateTenantStatus', () => {
    it('should allow active tenants', () => {
      const result = tenantService.validateTenantStatus('active')
      expect(result.allowed).toBe(true)
    })

    it('should block suspended tenants', () => {
      const result = tenantService.validateTenantStatus('suspended')
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('TENANT_SUSPENDED')
    })

    it('should block archived tenants', () => {
      const result = tenantService.validateTenantStatus('archived')
      expect(result.allowed).toBe(false)
    })
  })

  describe('resolveTenantByHostname', () => {
    it('should return null when not implemented', async () => {
      const result = await tenantService.resolveTenantByHostname('test.com')
      expect(result).toBeNull()
    })
  })
})
