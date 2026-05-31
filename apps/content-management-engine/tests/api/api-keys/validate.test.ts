import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../../src/payload.config'
import { POST } from '../../../src/app/(payload)/api/api-keys/validate/route'
import { NextRequest } from 'next/server'
import { createMockTenant } from '../../utils'
import crypto from 'crypto'

describe('API Key Validation Custom Endpoint', () => {
  let payload: any
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret'
  let tenant: any
  const createdTenants: string[] = []
  const createdApiKeys: string[] = []

  beforeAll(async () => {
    // Prevent timing-safe validation 500 errors by pre-setting test secret
    if (!process.env.INTERNAL_SERVICE_SECRET) {
      process.env.INTERNAL_SERVICE_SECRET = 'hermes-internal-secret'
    }
    payload = await getPayload({ config: await config })
    
    // Create an active tenant
    const uniqueSuffix = Date.now()
    tenant = await createMockTenant(payload, `Tenant Valid - ${uniqueSuffix}`, `tenant-valid-${uniqueSuffix}.com`)
    createdTenants.push(tenant.id)
  })

  afterAll(async () => {
    if (!payload) return
    for (const id of createdApiKeys) {
      await payload.delete({
        collection: 'api-keys',
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
    // Safely tear down PostgreSQL client pool connections to prevent open handles
    if (payload.db && typeof payload.db.destroy === 'function') {
      await payload.db.destroy()
    }
  })

  const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
    return new NextRequest('http://localhost:3000/api/api-keys/validate', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        ...headers,
      }),
      body: JSON.stringify(body),
    })
  }

  it('should return 401 if X-Internal-Secret is missing or invalid', async () => {
    const req1 = createMockRequest({ apiKey: 'some-key' })
    const res1 = await POST(req1)
    expect(res1.status).toBe(401)
    const body1 = await res1.json()
    expect(body1.error).toBe('Internal authentication failed')

    const req2 = createMockRequest({ apiKey: 'some-key' }, { 'X-Internal-Secret': 'wrong-secret' })
    const res2 = await POST(req2)
    expect(res2.status).toBe(401)
    const body2 = await res2.json()
    expect(body2.error).toBe('Internal authentication failed')
  })

  it('should return 500 if INTERNAL_SERVICE_SECRET is unset in the environment', async () => {
    const originalSecret = process.env.INTERNAL_SERVICE_SECRET
    delete process.env.INTERNAL_SERVICE_SECRET

    try {
      const req = createMockRequest({ apiKey: 'some-key' }, { 'X-Internal-Secret': 'some-secret' })
      const res = await POST(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('Internal server configuration error')
    } finally {
      if (originalSecret === undefined) {
        delete process.env.INTERNAL_SERVICE_SECRET
      } else {
        process.env.INTERNAL_SERVICE_SECRET = originalSecret
      }
    }
  })

  it('should return 400 if apiKey is missing in the body', async () => {
    const req = createMockRequest({}, { 'X-Internal-Secret': internalSecret })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('API Key is required')
  })

  it('should return 401 if API key is not found in database', async () => {
    const req = createMockRequest({ apiKey: 'does-not-exist' }, { 'X-Internal-Secret': internalSecret })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toBe('Invalid API Key or expired.')
  })

  it('should return 401 if API key is suspended', async () => {
    const createdKey = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Suspended Key',
        email: 'suspended@tenant.com',
        tenant: tenant.id,
        enableAPIKey: false,
        apiKey: 'suspended-key-test-abc-123',
      },
      overrideAccess: true,
    })
    createdApiKeys.push(createdKey.id)
    const rawKey = createdKey.apiKey

    const req = createMockRequest({ apiKey: rawKey }, { 'X-Internal-Secret': internalSecret })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toBe('Invalid API Key or expired.')
  })

  it('should return 401 if API key is expired', async () => {
    // Create a key expired yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const createdKey = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Expired Key',
        email: 'expired@tenant.com',
        tenant: tenant.id,
        enableAPIKey: true,
        expiresAt: yesterday.toISOString(),
        apiKey: 'expired-key-test-abc-123',
      },
      overrideAccess: true,
    })
    createdApiKeys.push(createdKey.id)
    const rawKey = createdKey.apiKey

    const req = createMockRequest({ apiKey: rawKey }, { 'X-Internal-Secret': internalSecret })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toBe('Invalid API Key or expired.')
  })

  it('should return 200 OK and key details for a valid active API key', async () => {
    const createdKey = await payload.create({
      collection: 'api-keys',
      data: {
        label: 'Valid Key',
        email: 'valid@tenant.com',
        tenant: tenant.id,
        enableAPIKey: true,
        apiKey: 'valid-key-test-abc-123',
      },
      overrideAccess: true,
    })
    createdApiKeys.push(createdKey.id)
    const rawKey = createdKey.apiKey

    const req = createMockRequest({ apiKey: rawKey }, { 'X-Internal-Secret': internalSecret })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.apiKey.id).toBe(String(createdKey.id))
    expect(body.apiKey.label).toBe('Valid Key')
    expect(body.apiKey.email).toBe('valid@tenant.com')
    expect(body.apiKey.tenant).toBe(String(tenant.id))
  })
})
