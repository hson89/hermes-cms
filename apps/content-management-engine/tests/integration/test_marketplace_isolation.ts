import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * App Marketplace Isolation Validation
 * Asserts that TenantApps and JWTTokens are properly isolated between tenants.
 */

describe('App Marketplace Isolation', () => {
  let payload: any
  const createdTenants: string[] = []
  const createdMarketplaceApps: string[] = []
  const createdTenantApps: string[] = []
  const createdJWTTokens: string[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    if (!payload) return
    for (const id of createdJWTTokens) {
      await payload.delete({
        collection: 'jwt-tokens',
        id,
        overrideAccess: true,
      }).catch(() => {})
    }
    for (const id of createdTenantApps) {
      await payload.delete({
        collection: 'tenant-apps',
        id,
        overrideAccess: true,
      }).catch(() => {})
    }
    for (const id of createdMarketplaceApps) {
      await payload.delete({
        collection: 'marketplace-apps',
        id,
        overrideAccess: true,
      }).catch(() => {})
    }
    for (const id of createdTenants) {
      await payload.delete({
        collection: 'tenants',
        id,
        overrideAccess: true,
      }).catch(() => {})
    }
  })

  it('should isolate TenantApps between tenants', async () => {
    const uniqueId = Date.now()
    
    // 1. Create Tenant A & B
    const tenantA = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant A',
        slug: `mkt-tenant-a-${uniqueId}`,
        domains: [{ hostname: `mkt-tenant-a-${uniqueId}.com`, isPrimary: true }]
      },
    })
    createdTenants.push(tenantA.id)

    const tenantB = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant B',
        slug: `mkt-tenant-b-${uniqueId}`,
        domains: [{ hostname: `mkt-tenant-b-${uniqueId}.com`, isPrimary: true }]
      },
    })
    createdTenants.push(tenantB.id)

    // 2. Create a Marketplace App
    const app = await payload.create({
      collection: 'marketplace-apps',
      data: {
        name: 'Configurator',
        slug: `configurator-${uniqueId}`,
        baseUrl: 'https://configurator.com',
      },
    })
    createdMarketplaceApps.push(app.id)

    // 3. Install App for Tenant A
    const tenantAppA = await payload.create({
      collection: 'tenant-apps',
      data: {
        app: app.id,
        tenant: tenantA.id,
        status: 'active',
      },
    })
    createdTenantApps.push(tenantAppA.id)

    // 4. Attempt to fetch TenantApp A with Tenant B context
    const mockUserB = {
      id: 'user-b',
      role: 'admin',
      tenants: [{ tenant: tenantB.id }],
      collection: 'users',
    }

    const result = await payload.find({
      collection: 'tenant-apps',
      where: {
        id: { equals: tenantAppA.id },
      },
      user: mockUserB,
      overrideAccess: false,
    })

    expect(result.docs.length).toBe(0)
  })

  it('should isolate JWTTokens between tenants', async () => {
    const uniqueId = Date.now()
    const tenantA = createdTenants[0]
    const tenantB = createdTenants[1]
    const app = createdMarketplaceApps[0]

    // 1. Create a JWT Token Hash for Tenant A
    const tokenA = await payload.create({
      collection: 'jwt-tokens',
      data: {
        tokenHash: `hash-a-${uniqueId}`,
        tenant: tenantA,
        appId: app,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      overrideAccess: true, // Created via system/endpoint
    })
    createdJWTTokens.push(tokenA.id)

    // 2. Attempt to fetch Token A with Tenant B context
    const mockUserB = {
      id: 'user-b',
      role: 'admin',
      tenants: [{ tenant: tenantB }],
      collection: 'users',
    }

    const result = await payload.find({
      collection: 'jwt-tokens',
      where: {
        id: { equals: tokenA.id },
      },
      user: mockUserB,
      overrideAccess: false,
    })

    expect(result.docs.length).toBe(0)
  })

  it('should restrict marketplace-apps creation to super-admin', async () => {
    const uniqueId = Date.now()
    const tenantAdmin = {
      id: 'tenant-admin',
      role: 'admin',
      collection: 'users',
    }

    await expect(payload.create({
      collection: 'marketplace-apps',
      data: {
        name: 'Illegal App',
        slug: `illegal-${uniqueId}`,
        baseUrl: 'https://hack.com',
      },
      user: tenantAdmin,
      overrideAccess: false,
    })).rejects.toThrow()
  })
})
