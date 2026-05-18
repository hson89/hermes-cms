import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { createMockTenant, createMockUser } from '../utils'

describe('APIKeys Collection Lifecycle & Access Isolation', () => {
  let payload: any
  let tenant1: any
  let tenant2: any
  let adminUserTenant1: any
  let adminUserTenant2: any
  let superAdminUser: any

  beforeAll(async () => {
    payload = await getPayload({ config })

    const uniqueSuffix = Date.now()

    // 1. Create two isolated tenants
    tenant1 = await createMockTenant(payload, `Tenant A - ${uniqueSuffix}`, `tenant-a-${uniqueSuffix}.com`)
    tenant2 = await createMockTenant(payload, `Tenant B - ${uniqueSuffix}`, `tenant-b-${uniqueSuffix}.com`)

    // 2. Create tenant admin users for both tenants
    adminUserTenant1 = await createMockUser(payload, `admin-t1-${uniqueSuffix}@hermes-ai.com`, 'tenant-admin', tenant1.id)
    adminUserTenant2 = await createMockUser(payload, `admin-t2-${uniqueSuffix}@hermes-ai.com`, 'tenant-admin', tenant2.id)

    // 3. Create a global super admin user
    superAdminUser = await createMockUser(payload, `super-${uniqueSuffix}@hermes-ai.com`, 'super-admin')
  })

  it('should successfully persist custom owner email when creating an API Key', async () => {
    const keyData = {
      label: 'Production CI Pipeline',
      email: 'ci-pipeline@tenant-a.com',
      tenant: tenant1.id,
      enableAPIKey: true,
    }

    // Create via super-admin to bypass access limitations
    const createdKey = await payload.create({
      collection: 'api-keys',
      data: keyData,
      overrideAccess: true,
    })

    expect(createdKey).toBeDefined()
    expect(createdKey.id).toBeDefined()
    expect(createdKey.label).toBe(keyData.label)
    
    // Crucial: Assert that the custom email field is successfully persisted
    expect(createdKey.email).toBe(keyData.email)

    // Fetch from database directly to double-check persistence
    const fetchedKey = await payload.findByID({
      collection: 'api-keys',
      id: createdKey.id,
      overrideAccess: true,
    })
    expect(fetchedKey.email).toBe(keyData.email)
  })

  it('should enforce strict tenant isolation for tenant admin reads', async () => {
    const keyTenant1 = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Tenant 1 Key',
        email: 't1@domain.com',
        tenant: tenant1.id,
        enableAPIKey: true,
      },
      overrideAccess: true,
    })

    const keyTenant2 = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Tenant 2 Key',
        email: 't2@domain.com',
        tenant: tenant2.id,
        enableAPIKey: true,
      },
      overrideAccess: true,
    })

    // Fetch keys using Tenant 1's admin user session
    const readResultT1 = await payload.find({
      collection: 'api-keys',
      user: adminUserTenant1,
      overrideAccess: false,
    })

    // Should see Tenant 1 keys, but NOT Tenant 2 keys
    const returnedIdsT1 = readResultT1.docs.map((doc: any) => doc.id)
    expect(returnedIdsT1).toContain(keyTenant1.id)
    expect(returnedIdsT1).not.toContain(keyTenant2.id)

    // Fetch keys using Tenant 2's admin user session
    const readResultT2 = await payload.find({
      collection: 'api-keys',
      user: adminUserTenant2,
      overrideAccess: false,
    })

    // Should see Tenant 2 keys, but NOT Tenant 1 keys
    const returnedIdsT2 = readResultT2.docs.map((doc: any) => doc.id)
    expect(returnedIdsT2).toContain(keyTenant2.id)
    expect(returnedIdsT2).not.toContain(keyTenant1.id)
  })

  it('should allow super admin to view keys across all tenants', async () => {
    const keyTenant1 = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Super Read T1 Key',
        email: 't1-super@domain.com',
        tenant: tenant1.id,
        enableAPIKey: true,
      },
      overrideAccess: true,
    })

    const keyTenant2 = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Super Read T2 Key',
        email: 't2-super@domain.com',
        tenant: tenant2.id,
        enableAPIKey: true,
      },
      overrideAccess: true,
    })

    // Fetch keys using global super admin user session
    const readResultSuper = await payload.find({
      collection: 'api-keys',
      user: superAdminUser,
      overrideAccess: false,
    })

    const returnedIds = readResultSuper.docs.map((doc: any) => doc.id)
    expect(returnedIds).toContain(keyTenant1.id)
    expect(returnedIds).toContain(keyTenant2.id)
  })
})
