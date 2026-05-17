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
    const uniqueId = Date.now()
    
    // 1. Create Tenant A
    const tenantA = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant A',
        slug: `tenant-a-${uniqueId}`,
        domains: [
          { hostname: `tenant-a-${uniqueId}.com`, isPrimary: true }
        ]
      },
    })

    // 2. Create Tenant B
    const tenantB = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant B',
        slug: `tenant-b-${uniqueId}`,
        domains: [
          { hostname: `tenant-b-${uniqueId}.com`, isPrimary: true }
        ]
      },
    })

    // Create ContentType for Tenant A
    const contentTypeA = await payload.create({
      collection: 'content-types',
      data: {
        name: 'Post A',
        schema: { type: 'object', properties: {} },
        tenant: tenantA.id,
      },
    })

    // 3. Create ContentItem for Tenant A
    const itemA = await payload.create({
      collection: 'content-items',
      data: {
        title: 'Private Item A',
        contentType: contentTypeA.id,
        tenant: tenantA.id,
      },
    })

    // 4. Attempt to fetch ContentItem A with Tenant B context
    // In Payload, we simulate this by passing a user scoped to Tenant B
    const mockUserB = {
      id: 'user-b',
      role: 'editor',
      tenants: [
        {
          tenant: tenantB.id,
        }
      ],
      tenantId: tenantB.id,
      collection: 'users',
    }

    const result = await payload.find({
      collection: 'content-items',
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
    const uniqueId = Date.now()
    
    const tenantA = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant A Admin',
        slug: `tenant-a-admin-${uniqueId}`,
        domains: [
          { hostname: `tenant-a-admin-${uniqueId}.com`, isPrimary: true }
        ]
      },
    })

    // Create ContentType for Tenant A
    const contentTypeA = await payload.create({
      collection: 'content-types',
      data: {
        name: 'Post Admin',
        schema: { type: 'object', properties: {} },
        tenant: tenantA.id,
      },
    })

    const itemA = await payload.create({
      collection: 'content-items',
      data: {
        title: 'Private Item A Admin',
        contentType: contentTypeA.id,
        tenant: tenantA.id,
      },
    })

    const superAdminUser = {
      id: 'super-admin',
      role: 'super-admin',
      collection: 'users',
    }

    const result = await payload.find({
      collection: 'content-items',
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
