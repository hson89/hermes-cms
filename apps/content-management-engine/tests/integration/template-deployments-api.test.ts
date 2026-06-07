import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { createMockTenant, createMockUser } from '../utils'

describe('TemplateDeployments Collection Tenant Isolation', () => {
  let payload: any
  let tenant1: any
  let tenant2: any
  let userTenant1: any
  let userTenant2: any
  let template1: any
  let site1: any
  
  const createdTenants: string[] = []
  const createdUsers: string[] = []
  const createdTemplates: string[] = []
  const createdSites: string[] = []
  const createdDeployments: string[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })

    const uniqueSuffix = Date.now()

    // 1. Create two isolated tenants
    tenant1 = await createMockTenant(payload, `Tenant A - ${uniqueSuffix}`, `tenant-a-${uniqueSuffix}.com`)
    createdTenants.push(tenant1.id)
    tenant2 = await createMockTenant(payload, `Tenant B - ${uniqueSuffix}`, `tenant-b-${uniqueSuffix}.com`)
    createdTenants.push(tenant2.id)

    // 2. Create users for both tenants
    userTenant1 = await createMockUser(payload, `user-t1-${uniqueSuffix}@hermes-ai.com`, 'editor', tenant1.id)
    createdUsers.push(userTenant1.id)
    userTenant2 = await createMockUser(payload, `user-t2-${uniqueSuffix}@hermes-ai.com`, 'editor', tenant2.id)
    createdUsers.push(userTenant2.id)

    // 3. Create a content type for Tenant 1
    const contentType1 = await payload.create({
      collection: 'content-types' as never,
      data: {
        name: 'Test Post',
        slug: `test-post-${uniqueSuffix}`,
        tenant: tenant1.id,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          }
        }
      } as never,
    })
    createdTemplates.push(contentType1.id) // Using createdTemplates as a generic cleanup bucket for this small test

    // 4. Create a template and a site for Tenant 1
    template1 = await payload.create({
      collection: 'page-templates' as never,
      data: {
        name: 'Test Template',
        slug: `test-template-${uniqueSuffix}`,
        contentType: contentType1.id,
        archetype: 'landing',
        tenant: tenant1.id,
      } as never,
    })
    createdTemplates.push(template1.id)

    site1 = await payload.create({
      collection: 'hosted-sites' as never,
      data: {
        name: 'Test Site',
        slug: `test-site-${uniqueSuffix}`,
        template: 'nextjs-blog',
        tenant: tenant1.id,
      } as never,
    })
    createdSites.push(site1.id)

    // 5. Create a deployment for Tenant 1
    const deployment = await payload.create({
      collection: 'template-deployments' as never,
      data: {
        template: template1.id,
        site: site1.id,
        triggeredBy: userTenant1.id,
        status: 'success',
        payload: { version: '1.0.0' },
        tenant: tenant1.id,
      } as never,
    })
    createdDeployments.push(deployment.id)
  })

  afterAll(async () => {
    if (!payload) return
    // Cleanup in reverse order
    for (const id of createdDeployments) {
      await payload.delete({ collection: 'template-deployments', id, overrideAccess: true }).catch(() => {})
    }
    for (const id of createdSites) {
      await payload.delete({ collection: 'hosted-sites', id, overrideAccess: true }).catch(() => {})
    }
    for (const id of createdTemplates) {
      await payload.delete({ collection: 'page-templates', id, overrideAccess: true }).catch(() => {})
    }
    for (const id of createdUsers) {
      await payload.delete({ collection: 'users', id, overrideAccess: true }).catch(() => {})
    }
    for (const id of createdTenants) {
      await payload.delete({ collection: 'tenants', id, overrideAccess: true }).catch(() => {})
    }
    
    // Explicitly destroy the database pool to prevent hanging tasks
    if (payload.db && typeof payload.db.destroy === 'function') {
      await payload.db.destroy()
    }
  })

  it('should allow user of Tenant 1 to see their own deployment', async () => {
    const result = await payload.find({
      collection: 'template-deployments',
      user: userTenant1,
      overrideAccess: false,
    })

    expect(result.docs.length).toBeGreaterThanOrEqual(1)
    expect(result.docs[0].tenant.id || result.docs[0].tenant).toBe(tenant1.id)
  })

  it('should NOT allow user of Tenant 2 to see Tenant 1 deployment', async () => {
    const result = await payload.find({
      collection: 'template-deployments',
      user: userTenant2,
      overrideAccess: false,
    })

    const foundT1 = result.docs.some((doc: any) => (doc.tenant.id || doc.tenant) === tenant1.id)
    expect(foundT1).toBe(false)
  })
})
