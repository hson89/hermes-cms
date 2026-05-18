import type { Payload, PayloadRequest } from 'payload'
import { HostedSite } from '../payload-types'

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
}
