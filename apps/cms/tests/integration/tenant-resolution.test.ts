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
    const uniqueId = Date.now()
    const hostname = `branded-${uniqueId}.com`
    const slug = `domain-test-${uniqueId}`
    // 1. Create a tenant with a domain
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Domain Test',
        slug,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })

    // 2. Call the internal service logic directly for testing
    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    const resolved = await service.resolveTenantByHostname(hostname)
    expect(resolved).not.toBeNull()
    expect(resolved?.slug).toBe(slug)
  })

  it('should fallback to slug resolution', async () => {
    const uniqueId = Date.now()
    const slug = `fallback-tenant-${uniqueId}`
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Slug Fallback Test',
        slug,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: `fallback-tenant-${uniqueId}.com`, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // hostname starts with the slug
    const resolved = await service.resolveTenantByHostname(`${slug}.hermes-cms.com`)
    expect(resolved).not.toBeNull()
    expect(resolved?.slug).toBe(slug)
  })
})
