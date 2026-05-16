import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T015 - Integration test for tenant soft-delete (Archived status)
 */
describe('Tenant Soft-Delete', () => {
  let payload: any

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('should allow setting status to archived', async () => {
    // 1. Create a tenant
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Soft Delete Test',
        slug: 'soft-delete-test',
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
      },
      overrideAccess: true,
    })

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
