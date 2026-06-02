import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { HostedSite, Tenant, User } from '../../src/payload-types'

/**
 * T029 - Integration test for HostedSites collection and deployment flow.
 * Verifies creation, multi-tenant isolation, and status updates.
 */

describe('HostedSites Integration', () => {
  let payload: any
  let tenantA: Tenant
  let tenantB: Tenant
  let editorA: any
  let editorB: any
  const createdTenants: any[] = []
  const createdHostedSites: any[] = []

  beforeAll(async () => {
    payload = await getPayload({ config })
    const uniqueId = Date.now()

    // Setup Test Tenants
    tenantA = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant A',
        slug: `tenant-a-${uniqueId}`,
        domains: [{ hostname: `a-${uniqueId}.com`, isPrimary: true }],
      },
    })
    createdTenants.push(tenantA.id)

    tenantB = await payload.create({
      collection: 'tenants',
      data: {
        name: 'Tenant B',
        slug: `tenant-b-${uniqueId}`,
        domains: [{ hostname: `b-${uniqueId}.com`, isPrimary: true }],
      },
    })
    createdTenants.push(tenantB.id)

    // Setup Mock Users
    editorA = {
      id: `user-a-${uniqueId}`,
      role: 'editor',
      tenants: [{ tenant: tenantA.id }],
      collection: 'users',
    }

    editorB = {
      id: `user-b-${uniqueId}`,
      role: 'editor',
      tenants: [{ tenant: tenantB.id }],
      collection: 'users',
    }
  })

  afterAll(async () => {
    if (!payload) return
    // Wait for any remaining background deployment timeouts to clear
    await new Promise((resolve) => setTimeout(resolve, 1000))

    for (const id of createdHostedSites) {
      await payload.delete({
        collection: 'hosted-sites',
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
    if (payload.db && typeof payload.db.destroy === 'function') {
      await payload.db.destroy()
    }
  })

  it('should create a HostedSite with correct initial status', async () => {
    const site = await payload.create({
      collection: 'hosted-sites',
      data: {
        name: 'Test Site A',
        template: 'nextjs-blog',
        tenant: tenantA.id,
      },
      user: editorA,
    })
    createdHostedSites.push(site.id)

    expect(site.status).toBe('pending')
    const siteTenantId = typeof site.tenant === 'object' ? site.tenant.id : site.tenant
    expect(siteTenantId).toBe(tenantA.id)
  })

  it('should enforce multi-tenant isolation on HostedSites', async () => {
    // Site created by Tenant A
    const siteA = await payload.create({
      collection: 'hosted-sites',
      data: {
        name: 'Private Site A',
        template: 'nextjs-blog',
        tenant: tenantA.id,
      },
      user: editorA,
    })
    createdHostedSites.push(siteA.id)

    // Tenant B should NOT see Site A
    const resultB = await payload.find({
      collection: 'hosted-sites',
      where: { id: { equals: siteA.id } },
      user: editorB,
      overrideAccess: false,
    })

    expect(resultB.docs.length).toBe(0)

    // Tenant A SHOULD see Site A
    const resultA = await payload.find({
      collection: 'hosted-sites',
      where: { id: { equals: siteA.id } },
      user: editorA,
      overrideAccess: false,
    })

    expect(resultA.docs.length).toBe(1)
  })

  it('should transition status to active via DeploymentService mock', async () => {
    // Create site to trigger hook
    const site = await payload.create({
      collection: 'hosted-sites',
      data: {
        name: 'Deploying Site',
        template: 'astro-portfolio',
        tenant: tenantA.id,
      },
      user: editorA,
    })
    createdHostedSites.push(site.id)

    // The afterChange hook triggers DeploymentService.triggerDeployment
    // which starts by setting status to 'deploying'
    
    // Poll for status change to 'active' (DeploymentService mock takes 500ms in test)
    await new Promise(resolve => setTimeout(resolve, 1000))

    const updatedSite = await payload.findByID({
      collection: 'hosted-sites',
      id: site.id,
    })

    expect(updatedSite.status).toBe('active')
    expect(updatedSite.deployedUrl).toContain('hermes-hosted.app')
  }, 5000) // Lower timeout since simulation is faster now
})
