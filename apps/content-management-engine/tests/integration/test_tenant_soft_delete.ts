import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T015 - Integration test for tenant soft-delete (Archived status)
 */
describe('Tenant Soft-Delete', () => {
  let payload: any
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
  })

  it('should allow setting status to archived', async () => {
    const uniqueId = Date.now()
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Soft Delete Test',
        slug: `soft-delete-test-${uniqueId}`,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: `soft-delete-test-${uniqueId}.com`, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant.id)

    expect(tenant.status).toBe('active')

    // 2. Update status to archived
    const updatedTenant = await payload.update({
      collection: 'tenants',
      id: tenant.id,
      data: {
        status: 'archived',
      },
      overrideAccess: true,
    })

    expect(updatedTenant.status).toBe('archived')
  })
})
