import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { GET } from '../../src/app/(payload)/api/tenants/resolve/route'
import { NextRequest } from 'next/server'

describe('Tenant API Resolution Endpoint', () => {
  let payload: any
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret'
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

  const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
    return new NextRequest(url, {
      headers: new Headers(headers),
    })
  }

  it('should return 401 Unauthorized if X-Internal-Secret header is missing or incorrect', async () => {
    // Missing header
    const req1 = createMockRequest('http://localhost:3000/api/tenants/resolve?hostname=example.com')
    const res1 = await GET(req1)
    expect(res1.status).toBe(401)
    const body1 = await res1.json()
    expect(body1.error).toBe('Internal authentication failed')

    // Incorrect header
    const req2 = createMockRequest('http://localhost:3000/api/tenants/resolve?hostname=example.com', {
      'X-Internal-Secret': 'wrong-secret',
    })
    const res2 = await GET(req2)
    expect(res2.status).toBe(401)
    const body2 = await res2.json()
    expect(body2.error).toBe('Internal authentication failed')
  })

  it('should return 400 Bad Request if hostname is missing', async () => {
    const req = createMockRequest('http://localhost:3000/api/tenants/resolve', {
      'X-Internal-Secret': internalSecret,
    })
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Hostname is required')
    expect(body.code).toBe('HOSTNAME_REQUIRED')
  })

  it('should return 404 Not Found if no tenant matches the hostname', async () => {
    const req = createMockRequest('http://localhost:3000/api/tenants/resolve?hostname=does-not-exist.com', {
      'X-Internal-Secret': internalSecret,
    })
    const res = await GET(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Tenant not found')
    expect(body.code).toBe('TENANT_NOT_RESOLVED')
  })

  it('should return 403 Forbidden if tenant status is suspended', async () => {
    const uniqueId = Date.now()
    const hostname = `suspended-api-${uniqueId}.com`
    
    // Create a suspended tenant
    const tenant1 = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Suspended Tenant API',
        slug: `suspended-api-${uniqueId}`,
        status: 'suspended',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant1.id)

    const req = createMockRequest(`http://localhost:3000/api/tenants/resolve?hostname=${hostname}`, {
      'X-Internal-Secret': internalSecret,
    })
    const res = await GET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Tenant access blocked')
    expect(body.code).toBe('TENANT_SUSPENDED')
    expect(body.status).toBe('suspended')
  })

  it('should return 403 Forbidden if tenant status is archived', async () => {
    const uniqueId = Date.now()
    const hostname = `archived-api-${uniqueId}.com`
    
    // Create an archived tenant
    const tenant2 = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Archived Tenant API',
        slug: `archived-api-${uniqueId}`,
        status: 'archived',
        tier: 'standard',
        defaultLocale: 'en',
        domains: [
          { hostname, isPrimary: true }
        ]
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant2.id)

    const req = createMockRequest(`http://localhost:3000/api/tenants/resolve?hostname=${hostname}`, {
      'X-Internal-Secret': internalSecret,
    })
    const res = await GET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Tenant access blocked')
    expect(body.code).toBe('TENANT_ARCHIVED')
    expect(body.status).toBe('archived')
  })

  it('should return 200 OK and tenant metadata for an active tenant', async () => {
    const uniqueId = Date.now()
    const hostname = `active-api-${uniqueId}.com`
    const slug = `active-api-${uniqueId}`
    
    // Create an active tenant
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Active Tenant API',
        slug,
        status: 'active',
        tier: 'premium',
        defaultLocale: 'en',
        domains: [
          { hostname, isPrimary: true }
        ],
        branding: {
          primaryColor: '#3366cc',
        }
      },
      overrideAccess: true,
    })
    createdTenants.push(tenant.id)

    const req = createMockRequest(`http://localhost:3000/api/tenants/resolve?hostname=${hostname}`, {
      'X-Internal-Secret': internalSecret,
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(tenant.id)
    expect(body.slug).toBe(slug)
    expect(body.status).toBe('active')
    expect(body.branding.primaryColor).toBe('#3366cc')
  })
})
