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
  async triggerDeployment(siteId: string | number, doc?: HostedSite, req?: PayloadRequest): Promise<void> {
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
          await this.payload.update({
            collection: 'hosted-sites',
            id: siteId,
            data: {
              status: 'active',
              deployedUrl: `https://${site.domain || `site-${site.id}.hermes-hosted.app`}`,
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
    templateId,
    siteId,
    userId,
    tenantId,
  }: {
    templateId: string | number
    siteId: string | number
    userId: string | number
    tenantId: string | number
  }) {
    // 1. Get site and validate webhook URL
    const site = (await this.payload.findByID({
      collection: 'hosted-sites',
      id: siteId,
      overrideAccess: true,
    })) as any

    if (!site || !site.templateSyncWebhookUrl) {
      throw new Error('Site not found or missing sync webhook URL')
    }

    // 2. Get and validate template
    const templateService = new TemplateService(this.payload)
    const validation = await templateService.validateTemplateForDeployment(templateId)
    if (!validation.valid) {
      throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
    }

    // 3. Create deployment log (pending)
    const deployment = await this.payload.create({
      collection: 'template-deployments',
      data: {
        template: templateId,
        site: siteId,
        triggeredBy: userId,
        status: 'pending',
        payload: {},
        tenant: tenantId,
      },
      overrideAccess: true,
    })

    try {
      // 4. Resolve template structure (as a snapshot)
      const template = (await this.payload.findByID({
        collection: 'page-templates',
        id: templateId,
        depth: 2,
        overrideAccess: true,
      })) as any

      const syncPayload = {
        templateId,
        templateName: template.name,
        layout: template.layout,
      }

      // 5. Trigger Webhook
      const response = await fetch(site.templateSyncWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload),
      })

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`)
      }

      // 6. Update status to success
      await this.payload.update({
        collection: 'template-deployments',
        id: deployment.id,
        data: {
          status: 'success',
          payload: syncPayload,
        },
        overrideAccess: true,
      })

      return deployment
    } catch (error) {
      console.error('[DeploymentService] Template deployment failed', error)
      await this.payload.update({
        collection: 'template-deployments',
        id: deployment.id,
        data: {
          status: 'failed',
        },
        overrideAccess: true,
      })
      throw error
    }
  }
}
