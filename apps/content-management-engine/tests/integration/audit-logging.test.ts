import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T025 - Test audit logging for resolution failures
 */
describe('Audit Logging', () => {
  let payload: any
  const testHostname = `non-existent-${Date.now()}.com`

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    if (!payload) return

    // Clean up audit logs created during this test
    const logs = await payload.find({
      collection: 'audit-logs',
      where: {
        'metadata.hostname': { equals: testHostname }
      },
      overrideAccess: true,
      depth: 0,
    })
    for (const log of logs.docs) {
      await payload.delete({
        collection: 'audit-logs',
        id: log.id,
        overrideAccess: true,
      }).catch(() => {})
    }
    if (payload.db && typeof payload.db.destroy === 'function') {
      await payload.db.destroy()
    }
  })

  it('should log a warning to audit-logs when resolution fails', async () => {
    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // Resolve a non-existent hostname
    await service.resolveTenantByHostname(testHostname)

    // Check audit logs
    const logs = await payload.find({
      collection: 'audit-logs',
      where: {
        action: { equals: 'TENANT_RESOLUTION_FAILURE' },
        'metadata.hostname': { equals: testHostname }
      },
      sort: '-createdAt',
      overrideAccess: true,
    })

    expect(logs.docs.length).toBeGreaterThan(0)
    expect(logs.docs[0].severity).toBe('warning')
    expect(logs.docs[0].metadata.hostname).toBe(testHostname)
  })
})
