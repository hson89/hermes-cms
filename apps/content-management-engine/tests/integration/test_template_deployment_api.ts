import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals'

jest.setTimeout(30000)

// Mock next/headers before other imports for ESM compatibility
jest.unstable_mockModule('next/headers', () => ({
  headers: () => Promise.resolve({
    get: (name: string) => {
      if (name.toLowerCase() === 'cookie') {
        return 'payload-token=mock-token'
      }
      return null
    }
  })
}))

describe('Template Deployment API & Service', () => {
  let payload: any
  let tenantA: any
  let tenantB: any
  let userA: any
  let userB: any
  let superAdmin: any
  let userNoTenant: any
  let contentTypeA: any
  let contentTypeB: any
  let templateA: any
  let templateB: any
  let globalTemplate: any
  let siteA: any
  let siteB: any
  let DeploymentService: any
  let NextRequest: any

  const createdTenants: any[] = []
  const createdUsers: any[] = []
  const createdContentTypes: any[] = []
  const createdTemplates: any[] = []
  const createdSites: any[] = []
  const createdDeployments: any[] = []

  let fetchSpy: any

  beforeAll(async () => {
    // Dynamically import modules to ensure ESM mocks are resolved first
    const payloadModule = await import('payload')
    const configModule = await import('../../src/payload.config')
    const serviceModule = await import('../../src/services/deployment_service')
    const serverModule = await import('next/server')

    DeploymentService = serviceModule.DeploymentService
    NextRequest = serverModule.NextRequest

    payload = await payloadModule.getPayload({ config: configModule.default })
    const uniqueId = Date.now()

    // 1. Setup Mock Fetch
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    )

    // 2. Setup Tenants
    tenantA = await payload.create({
      collection: 'tenants',
      data: {
        name: `Tenant A - ${uniqueId}`,
        slug: `tenant-a-${uniqueId}`,
        domains: [{ hostname: `a-${uniqueId}.com`, isPrimary: true }],
      },
    })
    createdTenants.push(tenantA.id)

    tenantB = await payload.create({
      collection: 'tenants',
      data: {
        name: `Tenant B - ${uniqueId}`,
        slug: `tenant-b-${uniqueId}`,
        domains: [{ hostname: `b-${uniqueId}.com`, isPrimary: true }],
      },
    })
    createdTenants.push(tenantB.id)

    // 3. Setup Users
    userA = await payload.create({
      collection: 'users',
      data: {
        name: 'Editor A',
        email: `editor-a-${uniqueId}@test.com`,
        password: 'Password123!',
        role: 'editor',
        tenants: [{ tenant: tenantA.id }],
      },
    })
    createdUsers.push(userA.id)

    userB = await payload.create({
      collection: 'users',
      data: {
        name: 'Editor B',
        email: `editor-b-${uniqueId}@test.com`,
        password: 'Password123!',
        role: 'editor',
        tenants: [{ tenant: tenantB.id }],
      },
    })
    createdUsers.push(userB.id)

    superAdmin = await payload.create({
      collection: 'users',
      data: {
        name: 'Super Admin User',
        email: `super-${uniqueId}@test.com`,
        password: 'Password123!',
        role: 'super-admin',
        tenants: [],
      },
    })
    createdUsers.push(superAdmin.id)

    userNoTenant = await payload.create({
      collection: 'users',
      data: {
        name: 'User Without Tenant',
        email: `notenant-${uniqueId}@test.com`,
        password: 'Password123!',
        role: 'editor',
        tenants: [],
      },
    })
    createdUsers.push(userNoTenant.id)

    // 4. Setup ContentTypes
    contentTypeA = await payload.create({
      collection: 'content-types',
      data: {
        name: 'Article A',
        slug: `article-a-${uniqueId}`,
        status: 'published',
        schema: {
          fields: [
            { name: 'title', type: 'text', required: true },
          ],
        },
        tenant: tenantA.id,
      },
    })
    createdContentTypes.push(contentTypeA.id)

    contentTypeB = await payload.create({
      collection: 'content-types',
      data: {
        name: 'Article B',
        slug: `article-b-${uniqueId}`,
        status: 'published',
        schema: {
          fields: [
            { name: 'title', type: 'text', required: true },
          ],
        },
        tenant: tenantB.id,
      },
    })
    createdContentTypes.push(contentTypeB.id)

    // 5. Setup Sites
    siteA = await payload.create({
      collection: 'hosted-sites',
      data: {
        name: 'Hosted Site A',
        template: 'nextjs-blog',
        tenant: tenantA.id,
        templateSyncWebhookUrl: 'https://webhook-a.com',
      },
    })
    createdSites.push(siteA.id)

    siteB = await payload.create({
      collection: 'hosted-sites',
      data: {
        name: 'Hosted Site B',
        template: 'nextjs-blog',
        tenant: tenantB.id,
        templateSyncWebhookUrl: 'https://webhook-b.com',
      },
    })
    createdSites.push(siteB.id)

    // 6. Setup Templates (with HTMLContent to pass pre-deployment validation)
    templateA = await payload.create({
      collection: 'page-templates' as never,
      data: {
        name: 'Template A',
        slug: 'template-a',
        archetype: 'landing',
        status: 'active',
        htmlContent: '<h1>Tenant A Template</h1>',
        contentType: contentTypeA.id,
        tenant: tenantA.id,
      } as never,
    })
    createdTemplates.push(templateA.id)

    templateB = await payload.create({
      collection: 'page-templates' as never,
      data: {
        name: 'Template B',
        slug: 'template-b',
        archetype: 'landing',
        status: 'active',
        htmlContent: '<h1>Tenant B Template</h1>',
        contentType: contentTypeB.id,
        tenant: tenantB.id,
      } as never,
    })
    createdTemplates.push(templateB.id)

    globalTemplate = await payload.create({
      collection: 'page-templates' as never,
      data: {
        name: 'Global Template',
        slug: 'global-template',
        archetype: 'landing',
        status: 'active',
        htmlContent: '<h1>Global Layout</h1>',
        isGlobal: true,
      } as never,
    })
    createdTemplates.push(globalTemplate.id)
  })

  afterAll(async () => {
    fetchSpy.mockRestore()

    // Wait for any background timeouts from triggerDeployment to complete
    await new Promise((resolve) => setTimeout(resolve, 1000))
    
    // Cleanup deployments
    for (const id of createdDeployments) {
      await payload.delete({ collection: 'template-deployments' as never, id, overrideAccess: true })
    }

    // Cleanup sites created manually
    for (const id of createdSites) {
      await payload.delete({ collection: 'hosted-sites', id, overrideAccess: true }).catch(() => {})
    }

    // Cleanup auto-created default hosted sites for our tenants to prevent FK check errors
    for (const tenantId of createdTenants) {
      try {
        const sites = await payload.find({
          collection: 'hosted-sites',
          where: { tenant: { equals: tenantId } },
          overrideAccess: true,
        })
        for (const site of sites.docs) {
          await payload.delete({ collection: 'hosted-sites', id: site.id, overrideAccess: true })
        }
      } catch (err) {
        // Ignore
      }
    }

    // Cleanup templates
    for (const id of createdTemplates) {
      await payload.delete({ collection: 'page-templates' as never, id, overrideAccess: true })
    }

    // Cleanup content types
    for (const id of createdContentTypes) {
      await payload.delete({ collection: 'content-types', id, overrideAccess: true })
    }

    // Cleanup users
    for (const id of createdUsers) {
      await payload.delete({ collection: 'users', id, overrideAccess: true })
    }

    // Cleanup tenants
    for (const id of createdTenants) {
      await payload.delete({ collection: 'tenants', id, overrideAccess: true })
    }
    
    if (payload.db && typeof payload.db.destroy === 'function') {
      await payload.db.destroy()
    }
  })

  describe('DeploymentService.deployTemplate', () => {
    it('should successfully trigger deployment and log success', async () => {
      const service = new DeploymentService(payload)
      const deployment = await service.deployTemplate({
        templateId: templateA.id,
        siteId: siteA.id,
        userId: userA.id,
        tenantId: tenantA.id,
      })

      expect(deployment).toBeDefined()
      createdDeployments.push(deployment.id)

      const log = await payload.findByID({
        collection: 'template-deployments' as never,
        id: deployment.id,
      })
      expect(log.status).toBe('success')
      expect(fetchSpy).toHaveBeenCalledWith('https://webhook-a.com', expect.any(Object))
    })

    it('should block tenant cross-deployments', async () => {
      const service = new DeploymentService(payload)
      await expect(
        service.deployTemplate({
          templateId: templateA.id,
          siteId: siteB.id,
          userId: userA.id,
          tenantId: tenantA.id,
        })
      ).rejects.toThrow('Unauthorized: Site does not belong to your tenant')
    })

    it('should allow global template deployment to any tenant site', async () => {
      // Temporarily set the global template's tenant to tenantB.id to bypass multi-tenant relationship validation
      await payload.update({
        collection: 'page-templates' as never,
        id: globalTemplate.id,
        data: {
          tenant: tenantB.id,
        } as never,
        overrideAccess: true,
      })

      const service = new DeploymentService(payload)
      const deployment = await service.deployTemplate({
        templateId: globalTemplate.id,
        siteId: siteB.id,
        userId: userB.id,
        tenantId: tenantB.id,
      })

      expect(deployment).toBeDefined()
      createdDeployments.push(deployment.id)

      // Restore tenant to null
      await payload.update({
        collection: 'page-templates' as never,
        id: globalTemplate.id,
        data: {
          tenant: null,
        } as never,
        overrideAccess: true,
      })
    })

    it('should throw if site is not found', async () => {
      const service = new DeploymentService(payload)
      await expect(
        service.deployTemplate({
          templateId: templateA.id,
          siteId: 99999,
          userId: userA.id,
          tenantId: tenantA.id,
        })
      ).rejects.toThrow('Not Found')
    })

    it('should succeed by simulating sync if site is missing sync webhook URL', async () => {
      const incompleteSite = await payload.create({
        collection: 'hosted-sites',
        data: {
          name: 'Site with no Webhook',
          template: 'nextjs-blog',
          tenant: tenantA.id,
        },
      })
      createdSites.push(incompleteSite.id)

      const service = new DeploymentService(payload)
      const deployment = await service.deployTemplate({
        templateId: templateA.id,
        siteId: incompleteSite.id,
        userId: userA.id,
        tenantId: tenantA.id,
      })

      expect(deployment).toBeDefined()
      createdDeployments.push(deployment.id)

      const log = await payload.findByID({
        collection: 'template-deployments' as never,
        id: deployment.id,
      })
      expect(log.status).toBe('success')
    })

    it('should throw if template is not found', async () => {
      const service = new DeploymentService(payload)
      await expect(
        service.deployTemplate({
          templateId: 99999,
          siteId: siteA.id,
          userId: userA.id,
          tenantId: tenantA.id,
        })
      ).rejects.toThrow('Not Found')
    })

    it('should handle webhook failure and mark deployment as failed', async () => {
      const service = new DeploymentService(payload)

      fetchSpy.mockImplementationOnce(() =>
        Promise.resolve(new Response(JSON.stringify({ success: false }), { status: 500 }))
      )

      await expect(
        service.deployTemplate({
          templateId: templateA.id,
          siteId: siteA.id,
          userId: userA.id,
          tenantId: tenantA.id,
        })
      ).rejects.toThrow('Webhook failed with status 500')

      const deployments = await payload.find({
        collection: 'template-deployments' as never,
        where: {
          site: { equals: siteA.id },
          template: { equals: templateA.id },
          status: { equals: 'failed' },
        },
        overrideAccess: true,
      })
      expect(deployments.docs.length).toBeGreaterThan(0)
      for (const d of deployments.docs) {
        createdDeployments.push(d.id)
      }
    })

    it('should throw if template does not belong to tenant', async () => {
      const service = new DeploymentService(payload)
      await expect(
        service.deployTemplate({
          templateId: templateB.id,
          siteId: siteA.id,
          userId: userA.id,
          tenantId: tenantA.id,
        })
      ).rejects.toThrow('Unauthorized: Template does not belong to your tenant')
    })

    it('should throw if template validation fails (e.g. empty layout and empty htmlContent)', async () => {
      const invalidTemplate = await payload.create({
        collection: 'page-templates' as never,
        data: {
          name: 'Invalid Template',
          slug: 'invalid-template',
          archetype: 'landing',
          status: 'active',
          contentType: contentTypeA.id,
          tenant: tenantA.id,
        } as never,
      })
      createdTemplates.push(invalidTemplate.id)

      const service = new DeploymentService(payload)
      await expect(
        service.deployTemplate({
          templateId: invalidTemplate.id,
          siteId: siteA.id,
          userId: userA.id,
          tenantId: tenantA.id,
        })
      ).rejects.toThrow('Template validation failed: Template layout is empty')
    })
  })

  describe('POST /api/templates/deploy route handler', () => {
    it('should successfully trigger deployment via route handler mock', async () => {
      // Dynamic import to ensure next/headers mock is loaded
      const { POST } = await import('../../src/app/(payload)/api/templates/deploy/route')

      // Mock payload auth
      const originalAuth = payload.auth
      payload.auth = jest.fn().mockReturnValue(Promise.resolve({ user: userA }))

      try {
        const req = new NextRequest('http://localhost:3000/api/templates/deploy', {
          method: 'POST',
          body: JSON.stringify({
            templateId: templateA.id,
            siteId: siteA.id,
          }),
        })

        const res = await POST(req)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        expect(body.deployment).toBeDefined()
        createdDeployments.push(body.deployment.id)
      } finally {
        payload.auth = originalAuth
      }
    })

    it('should resolve tenant context from site for super-admin without primary tenant', async () => {
      const { POST } = await import('../../src/app/(payload)/api/templates/deploy/route')

      // Mock payload auth for super-admin
      const originalAuth = payload.auth
      payload.auth = jest.fn().mockReturnValue(Promise.resolve({ user: superAdmin }))

      try {
        const req = new NextRequest('http://localhost:3000/api/templates/deploy', {
          method: 'POST',
          body: JSON.stringify({
            templateId: templateA.id,
            siteId: siteA.id,
          }),
        })

        const res = await POST(req)
        expect(res.status).toBe(200)

        const body = await res.json()
        expect(body.success).toBe(true)
        createdDeployments.push(body.deployment.id)
      } finally {
        payload.auth = originalAuth
      }
    })

    it('should return 400 if missing templateId or siteId', async () => {
      const { POST } = await import('../../src/app/(payload)/api/templates/deploy/route')

      // Mock payload auth
      const originalAuth = payload.auth
      payload.auth = jest.fn().mockReturnValue(Promise.resolve({ user: userA }))

      try {
        const req = new NextRequest('http://localhost:3000/api/templates/deploy', {
          method: 'POST',
          body: JSON.stringify({
            templateId: templateA.id,
          }),
        })

        const res = await POST(req)
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toBe('templateId and siteId are required')
      } finally {
        payload.auth = originalAuth
      }
    })

    it('should return 401 Unauthorized if user is not authenticated', async () => {
      const { POST } = await import('../../src/app/(payload)/api/templates/deploy/route')

      const originalAuth = payload.auth
      payload.auth = jest.fn().mockReturnValue(Promise.resolve({ user: null }))

      try {
        const req = new NextRequest('http://localhost:3000/api/templates/deploy', {
          method: 'POST',
          body: JSON.stringify({
            templateId: templateA.id,
            siteId: siteA.id,
          }),
        })

        const res = await POST(req)
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('Unauthorized')
      } finally {
        payload.auth = originalAuth
      }
    })

    it('should return 403 Forbidden if user has no tenant association', async () => {
      const { POST } = await import('../../src/app/(payload)/api/templates/deploy/route')

      const originalAuth = payload.auth
      payload.auth = jest.fn().mockReturnValue(Promise.resolve({ user: userNoTenant }))

      try {
        const req = new NextRequest('http://localhost:3000/api/templates/deploy', {
          method: 'POST',
          body: JSON.stringify({
            templateId: templateA.id,
            siteId: siteA.id,
          }),
        })

        const res = await POST(req)
        expect(res.status).toBe(403)
        const body = await res.json()
        expect(body.error).toBe('Tenant context not found')
      } finally {
        payload.auth = originalAuth
      }
    })

    it('should return 500 if deployment service throws an error', async () => {
      const { POST } = await import('../../src/app/(payload)/api/templates/deploy/route')

      const originalAuth = payload.auth
      payload.auth = jest.fn().mockReturnValue(Promise.resolve({ user: userA }))

      const deploySpy = jest.spyOn(DeploymentService.prototype, 'deployTemplate')
        .mockRejectedValue(new Error('Simulated deployment error'))

      try {
        const req = new NextRequest('http://localhost:3000/api/templates/deploy', {
          method: 'POST',
          body: JSON.stringify({
            templateId: templateA.id,
            siteId: siteA.id,
          }),
        })

        const res = await POST(req)
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.error).toBe('Simulated deployment error')
        expect(body.code).toBe('DEPLOYMENT_ERROR')
      } finally {
        payload.auth = originalAuth
        deploySpy.mockRestore()
      }
    })
  })
})
