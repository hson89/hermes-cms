import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T037 - Cross-tenant access validation
 * Asserts that users cannot access data belonging to other tenants.
 */

describe('Cross-Tenant Data Access', () => {
  let payload: any

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('should return 403 or not found when requesting another tenant\'s ContentItem', async () => {
    // 1. Create Tenant A
    const tenantA = await payload.create({
      collection: 'Tenants',
      data: { name: 'Tenant A', slug: 'tenant-a' },
    })

    // 2. Create Tenant B
    const tenantB = await payload.create({
      collection: 'Tenants',
      data: { name: 'Tenant B', slug: 'tenant-b' },
    })

    // 3. Create ContentItem for Tenant A
    const itemA = await payload.create({
      collection: 'ContentItems',
      data: {
        title: 'Private Item A',
        tenantId: tenantA.id,
      },
    })

    // 4. Attempt to fetch ContentItem A with Tenant B context
    // In Payload, we simulate this by passing a user scoped to Tenant B
    const mockUserB = {
      id: 'user-b',
      role: 'editor',
      tenantId: tenantB.id,
      collection: 'Users',
    }

    const result = await payload.find({
      collection: 'ContentItems',
      where: {
        id: { equals: itemA.id },
      },
      user: mockUserB,
      overrideAccess: false,
    })

    // 5. Expect response to be empty because of tenantDeliveryAccess
    expect(result.docs.length).toBe(0)
  })

  it('should allow super-admin to read across all tenants', async () => {
    const tenantA = await payload.create({
      collection: 'Tenants',
      data: { name: 'Tenant A Admin', slug: 'tenant-a-admin' },
    })

    const itemA = await payload.create({
      collection: 'ContentItems',
      data: {
        title: 'Private Item A Admin',
        tenantId: tenantA.id,
      },
    })

    const superAdminUser = {
      id: 'super-admin',
      role: 'super-admin',
      collection: 'Users',
    }

    const result = await payload.find({
      collection: 'ContentItems',
      where: {
        id: { equals: itemA.id },
      },
      user: superAdminUser,
      overrideAccess: false,
    })

    expect(result.docs.length).toBe(1)
    expect(result.docs[0].id).toBe(itemA.id)
  })
})
