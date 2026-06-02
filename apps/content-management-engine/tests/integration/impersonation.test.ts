import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

/**
 * T026, T027 - Test Super Admin impersonation logic
 */
describe('Tenant Impersonation', () => {
  let payload: any
  const createdTenants: string[] = []
  const createdUsers: string[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })

    // 1. Create a Super Admin
    const email = `impersonator-${Date.now()}@hermes-ai.com`
    const superAdmin = await payload.create({
      collection: 'users',
      data: {
        name: 'Impersonator',
        email,
        password: 'password123',
        role: 'super-admin',
      },
    })
    createdUsers.push(superAdmin.id)

    // 2. Create a Tenant
    const tenantSlug = `target-tenant-${Date.now()}`
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: `Target Tenant ${Date.now()}`,
        slug: tenantSlug,
        status: 'active',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname: `${tenantSlug}.com`, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant.id)
  })

  afterAll(async () => {
    if (!payload) return
    // 1. Clean up audit logs for the created users
    for (const userId of createdUsers) {
      const logs = await payload.find({
        collection: 'audit-logs',
        where: { user: { equals: userId } },
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
    }

    // 2. Clean up users
    for (const id of createdUsers) {
      await payload.delete({
        collection: 'users',
        id,
        overrideAccess: true,
      }).catch(() => {})
    }

    // 3. Clean up tenants
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

  it('should allow Super Admin to impersonate a tenant and log it', async () => {
    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    const superAdminId = createdUsers[0]
    const tenantId = createdTenants[0]

    const success = await service.impersonateTenant(superAdminId, tenantId)
    expect(success).toBe(true)

    // Check audit logs
    const logs = await payload.find({
      collection: 'audit-logs',
      where: {
        action: { equals: 'IMPERSONATION_START' },
        user: { equals: superAdminId }
      },
      overrideAccess: true,
      depth: 0,
    })

    expect(logs.docs.length).toBeGreaterThan(0)
    expect(logs.docs[0].isImpersonated).toBe(true)
    expect(logs.docs[0].tenant).toBe(tenantId)
  })

  it('should allow Super Admin to bypass status checks', async () => {
    const { TenantService } = await import('../../src/services/tenant-service')
    const service = new TenantService(payload)

    // Suspended tenant
    const status = service.validateTenantStatus('suspended', true) // isSuperAdmin = true
    expect(status.allowed).toBe(true)

    const normalStatus = service.validateTenantStatus('suspended', false)
    expect(normalStatus.allowed).toBe(false)
  })
})
