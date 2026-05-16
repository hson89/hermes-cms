import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T021 - Integration test for tenant resolution and slug fallback
 */
describe('Tenant Resolution API', () => {
  let payload: any
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret'

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('should resolve tenant by primary domain', async () => {
    // 1. Create a tenant with a domain
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Domain Test',
        slug: 'domain-test',
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: 'branded.com', isPrimary: true }
        ]
      },
      overrideAccess: true,
    })

    // 2. Call the internal service logic directly for testing
    // (We test the service logic here, API test would need a running server)
    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    const resolved = await service.resolveTenantByHostname('branded.com')
    expect(resolved).not.toBeNull()
    expect(resolved?.slug).toBe('domain-test')
  })

  it('should fallback to slug resolution', async () => {
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Slug Fallback Test',
        slug: 'fallback-tenant',
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: []
      },
      overrideAccess: true,
    })

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // hostname starts with the slug
    const resolved = await service.resolveTenantByHostname('fallback-tenant.hermes-cms.com')
    expect(resolved).not.toBeNull()
    expect(resolved?.slug).toBe('fallback-tenant')
  })
})
