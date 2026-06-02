import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T021 - Integration test for tenant resolution and slug fallback
 */
describe('Tenant Resolution API', () => {
  let payload: any
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret'
  const createdTenants: string[] = []

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
    if (payload.db && typeof payload.db.destroy === 'function') {
      await payload.db.destroy()
    }
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
    createdTenants.push(tenant.id)

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
    createdTenants.push(tenant.id)

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // hostname starts with the slug
    const resolved = await service.resolveTenantByHostname(`${slug}.hermes-cms.com`)
    expect(resolved).not.toBeNull()
    expect(resolved?.slug).toBe(slug)
  })

  it('should support mapping multiple domains to a single tenant', async () => {
    const uniqueId = Date.now()
    const domain1 = `multidomain-a-${uniqueId}.com`
    const domain2 = `multidomain-b-${uniqueId}.com`
    const slug = `multi-domain-test-${uniqueId}`

    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Multi Domain Tenant',
        slug,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: domain1, isPrimary: true },
          { hostname: domain2, isPrimary: false }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant.id)

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // Resolve domain 1
    const resolved1 = await service.resolveTenantByHostname(domain1)
    expect(resolved1).not.toBeNull()
    expect(resolved1?.id).toBe(tenant.id)

    // Resolve domain 2
    const resolved2 = await service.resolveTenantByHostname(domain2)
    expect(resolved2).not.toBeNull()
    expect(resolved2?.id).toBe(tenant.id)
  })

  it('should enforce unique domains across all tenants', async () => {
    const uniqueId = Date.now()
    const domain = `unique-shared-${uniqueId}.com`

    // Create Tenant 1 with the domain
    const tenant1 = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant Unique 1',
        slug: `tenant-u1-${uniqueId}`,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: domain, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant1.id)

    // Try to create Tenant 2 with the same domain and expect it to fail
    await expect(
      payload.create({
        collection: 'tenants',
        data: {
          name: 'Tenant Unique 2',
          slug: `tenant-u2-${uniqueId}`,
          status: 'active',
          tier: 'standard',
          defaultLocale: 'en',
          domains: [
            { hostname: domain, isPrimary: true }
          ]
        },
        overrideAccess: true,
      })
    ).rejects.toThrow()
  })

  it('should resolve soft-deleted (archived) tenants but status check must block them', async () => {
    const uniqueId = Date.now()
    const domain = `archived-gating-${uniqueId}.com`
    const slug = `archived-gating-${uniqueId}`

    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Archived Tenant',
        slug,
        status: 'archived',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: domain, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant.id)

    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // Domain resolution resolves the tenant metadata successfully
    const resolved = await service.resolveTenantByHostname(domain)
    expect(resolved).not.toBeNull()
    expect(resolved?.id).toBe(tenant.id)
    expect(resolved?.status).toBe('archived')

    // Status validation blocks standard user access
    const statusResult = service.validateTenantStatus(resolved?.status || 'archived')
    expect(statusResult.allowed).toBe(false)
    expect(statusResult.code).toBe('TENANT_ARCHIVED')
  })
})

