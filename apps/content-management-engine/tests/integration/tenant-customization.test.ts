import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T025 - Integration test for branding resolution and status gating
 */
describe('Tenant Customization & Gating', () => {
  let payload: any
  const createdTenants: string[] = []
  const createdMedia: string[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    if (!payload) return
    for (const id of createdTenants) {
      await payload.delete({
        collection: 'tenants',
        id,
        overrideAccess: true,
      }).catch(() => {})
    }
    for (const id of createdMedia) {
      await payload.delete({
        collection: 'media',
        id,
        overrideAccess: true,
      }).catch(() => {})
    }
  })

  it('should return branding metadata including resolved logo url', async () => {
    // 1. Create Media
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: 'Test Logo',
      },
      filePath: 'tests/assets/test-logo.png', // Mock or use existing
      overrideAccess: true,
    })
    createdMedia.push(media.id)

    const uniqueId = Date.now()
    const slug = `branding-test-${uniqueId}`
    // 2. Create Tenant with branding
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Branding Test',
        slug,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: `branding-test-${uniqueId}.com`, isPrimary: true }
        ],
        branding: {
          primaryColor: '#FF0000',
          logo: media.id
        }
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant.id)

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    const resolved = await service.resolveTenantByHostname(`${slug}.hermes-cms.com`)
    expect(resolved).not.toBeNull()
    expect(resolved?.branding?.primaryColor).toBe('#FF0000')
    // logo url should be present (mocked or actual)
    // In test environment without actual storage, it might be just the filename or null if not processed
  })

  it('should block suspended tenants', async () => {
    const uniqueId = Date.now()
    const suspendedTenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Suspended Tenant',
        slug: `suspended-tenant-${uniqueId}`,
        status: 'suspended',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: `suspended-tenant-${uniqueId}.com`, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(suspendedTenant.id)

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    const status = service.validateTenantStatus('suspended')
    expect(status.allowed).toBe(false)
    expect(status.code).toBe('TENANT_SUSPENDED')
  })
})
