import type { Payload, PayloadRequest } from 'payload'
import { HostedSite } from '../payload-types'
import { TemplateService } from './template_service'

/**
 * Service to orchestrate the deployment of front-end starter templates.
 * In a real application, this would interface with Vercel, Netlify, or custom Kubernetes/Docker orchestration APIs.
 *
 * T032 - Implement internal deployment infrastructure orchestration service
 */
export class DeploymentService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Triggers a deployment for a specific HostedSite.
   * @param siteId The ID of the HostedSite document
   * @param doc Optional pre-fetched document to avoid redundant lookup
   * @param req Optional request context to share transactions
   */
  async triggerDeployment(rawSiteId: string | number, doc?: HostedSite, req?: PayloadRequest): Promise<void> {
    const siteId = typeof rawSiteId === 'string' && !isNaN(Number(rawSiteId)) ? Number(rawSiteId) : rawSiteId
    try {
      const site = doc || await this.payload.findByID({
        collection: 'hosted-sites',
        id: siteId,
        overrideAccess: true,
        req,
      })

      if (!site) throw new Error('Site not found')

      // Mark as deploying - if we have a req, use it to stay within transaction if needed
      await this.payload.update({
        collection: 'hosted-sites',
        id: siteId,
        data: {
          status: 'deploying',
        },
        overrideAccess: true,
        req,
      })

      // Simulate deployment process
      console.log(`[DeploymentService] Starting deployment for site ${site.name} (${site.template})`)
      
      const deploymentDelay = process.env.NODE_ENV === 'test' ? 500 : 5000

      // The final status update happens outside the initial transaction/hook context
      // as it represents a long-running process completing.
      setTimeout(async () => {
        try {
          const tenantId = typeof site.tenant === 'object' && site.tenant !== null ? site.tenant.id : site.tenant
          const port = site.template === 'astro-portfolio' ? 3002 : 3001
          const deployedUrl = site.domain ? `https://${site.domain}` : `http://localhost:${port}/${tenantId}`

          await this.payload.update({
            collection: 'hosted-sites',
            id: siteId,
            data: {
              status: 'active',
              deployedUrl,
            },
            overrideAccess: true,
          })
          console.log(`[DeploymentService] Deployment completed for site ${site.name}`)
        } catch (updateError) {
          console.error('[DeploymentService] Failed to update status to active', updateError)
        }
      }, deploymentDelay)

    } catch (error) {
      console.error('[DeploymentService] Deployment failed', error)
      try {
        await this.payload.update({
          collection: 'hosted-sites',
          id: siteId,
          data: {
            status: 'failed',
          },
          overrideAccess: true,
          req,
        })
      } catch (updateError) {
        // ignore
      }
    }
  }

  /**
   * Deploys a template to a HostedSite.
   * Sends the template structure to the site's sync webhook.
   */
  async deployTemplate({
    templateId: rawTemplateId,
    siteId: rawSiteId,
    userId: rawUserId,
    tenantId: rawTenantId,
  }: {
    templateId: string | number
    siteId: string | number
    userId: string | number
    tenantId: string | number
  }, req?: PayloadRequest) {
    const templateId = typeof rawTemplateId === 'string' && !isNaN(Number(rawTemplateId)) ? Number(rawTemplateId) : rawTemplateId
    const siteId = typeof rawSiteId === 'string' && !isNaN(Number(rawSiteId)) ? Number(rawSiteId) : rawSiteId
    const userId = typeof rawUserId === 'string' && !isNaN(Number(rawUserId)) ? Number(rawUserId) : rawUserId
    const tenantId = typeof rawTenantId === 'string' && !isNaN(Number(rawTenantId)) ? Number(rawTenantId) : rawTenantId

    // 1. Get site and validate
    // NOTE: We do NOT pass `req` here (or in any subsequent overrideAccess calls)
    // because the multi-tenant plugin's beforeOperation hooks run regardless of
    // overrideAccess and try to process req.user.tenants[0].tenant as an object.
    // The JWT carries tenant as a raw integer, causing a TypeError inside the plugin.
    // All tenant isolation checks are done explicitly in this service.
    const site = (await this.payload.findByID({
      collection: 'hosted-sites',
      id: siteId,
      overrideAccess: true,
    })) as any

    if (!site) {
      throw new Error('Site not found')
    }

    const siteTenantId = typeof site.tenant === 'object' && site.tenant !== null ? site.tenant.id : site.tenant
    if (String(siteTenantId) !== String(tenantId)) {
      throw new Error('Unauthorized: Site does not belong to your tenant')
    }

    // 2. Get and validate template
    const template = (await this.payload.findByID({
      collection: 'page-templates' as never,
      id: templateId,
      depth: 2,
      overrideAccess: true,
    })) as unknown as Record<string, any>

    if (!template) {
      throw new Error('Template not found')
    }

    const templateTenantId = typeof template.tenant === 'object' && template.tenant !== null ? template.tenant.id : template.tenant
    if (!template.isGlobal && String(templateTenantId) !== String(tenantId)) {
      throw new Error('Unauthorized: Template does not belong to your tenant')
    }

    const templateService = new TemplateService(this.payload)
    const validation = await templateService.validateTemplateForDeployment(templateId)
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
    }

    // 3. Create deployment log (pending)
    // NOTE: We do NOT pass `req` here because all authorization checks are already
    // done above. Passing `req` causes Payload to re-validate relationship fields
    // (template, site, triggeredBy) against the request user's access controls,
    // which fails for global templates (isGlobal: true) whose tenant is null.
    let deployment: Record<string, any>
    try {
      deployment = (await this.payload.create({
        collection: 'template-deployments' as never,
        data: {
          template: templateId,
          site: siteId,
          triggeredBy: userId,
          status: 'pending',
          payload: {},
          tenant: tenantId,
        } as never,
        overrideAccess: true,
      })) as unknown as Record<string, any>
    } catch (createError: any) {
      console.error('[DeploymentService] Failed to create deployment log:', createError)
      if (createError.data) {
        console.error('[DeploymentService] Validation error data:', JSON.stringify(createError.data, null, 2))
      }
      throw createError
    }

    try {
      // 4. Resolve template structure (as a snapshot)
      const syncPayload = {
        templateId,
        templateName: template.name,
        layout: template.layout,
      }

      // 5. Trigger Webhook if configured, or simulate success
      if (site.templateSyncWebhookUrl) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        try {
          const response = await fetch(site.templateSyncWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncPayload),
            signal: controller.signal,
          })

          if (!response.ok) {
            throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`)
          }
        } finally {
          clearTimeout(timeoutId)
        }
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn(`[DeploymentService] No templateSyncWebhookUrl configured for site ${site.name}. Simulating sync webhook dispatch in local/dev mode.`)
      } else {
        throw new Error('No templateSyncWebhookUrl configured for site')
      }

      // 6. Update status to success
      await this.payload.update({
        collection: 'template-deployments' as never,
        id: deployment.id,
        data: {
          status: 'success',
          payload: syncPayload,
        } as never,
        overrideAccess: true,
      })

      return deployment
    } catch (error) {
      console.error('[DeploymentService] Template deployment failed', error)
      await this.payload.update({
        collection: 'template-deployments' as never,
        id: deployment.id,
        data: {
          status: 'failed',
        } as never,
        overrideAccess: true,
      })
      throw error
    }
  }
}
