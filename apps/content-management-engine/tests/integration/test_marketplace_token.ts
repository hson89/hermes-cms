import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { generateMarketplaceTokenEndpoint } from '../../src/services/marketplace/endpoints'

/**
 * JWT Generation Endpoint Validation
 * TDD for Story 1: Scoped Marketplace Token Generation
 */

describe('Marketplace Token Generation', () => {
  let payload: any
  const createdTenants: string[] = []
  const createdMarketplaceApps: string[] = []
  const secret = 'test-secret-123'

  beforeAll(async () => {
    payload = await getPayload({ config })
    process.env.MARKETPLACE_JWT_SECRET = secret
  })

  afterAll(async () => {
    if (!payload) return
    for (const id of createdMarketplaceApps) {
      await payload.delete({ collection: 'marketplace-apps', id, overrideAccess: true }).catch(() => {})
    }
    for (const id of createdTenants) {
      await payload.delete({ collection: 'tenants', id, overrideAccess: true }).catch(() => {})
    }
  })

  it('should generate a valid HS256 JWT and persist its hash', async () => {
    const uniqueId = Date.now()
    
    // 1. Setup Tenant and App
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Test Tenant',
        slug: `mkt-token-tenant-${uniqueId}`,
        domains: [{ hostname: `mkt-token-${uniqueId}.com`, isPrimary: true }]
      },
    })
    createdTenants.push(tenant.id)

    const app = await payload.create({
      collection: 'marketplace-apps',
      data: {
        name: 'Test App',
        slug: `test-app-${uniqueId}`,
        baseUrl: 'https://test.com',
      },
    })
    createdMarketplaceApps.push(app.id)

    const adminUser = {
      id: 'admin-user-123',
      role: 'admin',
      tenants: [{ tenant: tenant.id }],
      collection: 'users',
    }

    // 2. Mock Request object
    const mockReq = {
      user: adminUser,
      json: async () => ({
        tenantId: tenant.id,
        appId: app.id,
        scopes: ['read_stock', 'write_orders'],
      }),
      payload,
    }

    // 3. Call the handler directly
    const response = await (generateMarketplaceTokenEndpoint.handler as any)(mockReq)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.token).toBeDefined()

    // 4. Verify JWT Claims
    const decoded = jwt.verify(data.token, secret) as any
    expect(decoded.tenant_id).toBe(tenant.id)
    expect(decoded.app_id).toBe(app.id)
    expect(decoded.scopes).toContain('read_stock')

    // 5. Verify Hash Persistence
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex')
    const savedToken = await payload.find({
      collection: 'jwt-tokens',
      where: {
        tokenHash: { equals: tokenHash },
      },
    })

    expect(savedToken.docs.length).toBe(1)
    expect(savedToken.docs[0].tenant.id || savedToken.docs[0].tenant).toBe(tenant.id)
  })

  it('should forbid non-admins from generating tokens', async () => {
    const editorUser = {
      id: 'editor-user',
      role: 'editor',
      collection: 'users',
    }

    const mockReq = {
      user: editorUser,
      json: async () => ({
        tenantId: 'any',
        appId: 'any',
      }),
      payload,
    }

    const response = await (generateMarketplaceTokenEndpoint.handler as any)(mockReq)
    expect(response.status).toBe(403)
  })
})
