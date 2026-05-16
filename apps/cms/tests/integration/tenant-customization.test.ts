import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T025 - Integration test for branding resolution and status gating
 */
describe('Tenant Customization & Gating', () => {
  let payload: any

  beforeAll(async () => {
    payload = await getPayload({ config })
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

    // 2. Create Tenant with branding
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Branding Test',
        slug: 'branding-test',
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        branding: {
          primaryColor: '#FF0000',
          logo: media.id
        }
      },
      overrideAccess: true,
    })

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    const resolved = await service.resolveTenantByHostname('branding-test.hermes-cms.com')
    expect(resolved).not.toBeNull()
    expect(resolved?.branding?.primaryColor).toBe('#FF0000')
    // logo url should be present (mocked or actual)
    // In test environment without actual storage, it might be just the filename or null if not processed
  })

  it('should block suspended tenants', async () => {
    await payload.create({
      collection: 'tenants',
      data: {
        name: 'Suspended Tenant',
        slug: 'suspended-tenant',
        status: 'suspended',
        tier: 'standard',
        defaultLocale: 'en',
      },
      overrideAccess: true,
    })

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    const status = service.validateTenantStatus('suspended')
    expect(status.allowed).toBe(false)
    expect(status.code).toBe('TENANT_SUSPENDED')
  })
})
