import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T025 - Test audit logging for resolution failures
 */
describe('Audit Logging', () => {
  let payload: any

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  it('should log a warning to audit-logs when resolution fails', async () => {
    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // Resolve a non-existent hostname
    await service.resolveTenantByHostname('non-existent.com')

    // Check audit logs
    const logs = await payload.find({
      collection: 'audit-logs',
      where: {
        action: { equals: 'TENANT_RESOLUTION_FAILURE' }
      },
      overrideAccess: true,
    })

    expect(logs.docs.length).toBeGreaterThan(0)
    expect(logs.docs[0].severity).toBe('warning')
    expect(logs.docs[0].metadata.hostname).toBe('non-existent.com')
  })
})
