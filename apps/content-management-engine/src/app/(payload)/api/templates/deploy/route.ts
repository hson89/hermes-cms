import { getPayload, PayloadRequest } from 'payload'
import config from '@/payload.config'
import { DeploymentService } from '@/services/deployment_service'
import { NextRequest, NextResponse } from 'next/server'
import { getPrimaryTenantId } from '@/collections/Users/utils'

/**
 * POST /api/templates/deploy
 *
 * Triggers the deployment of a template to a specific HostedSite.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: await config })
    const { user } = await payload.auth(req)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set user on request to ensure it's available for Local API access control checks
    const payloadReq = req as unknown as PayloadRequest
    payloadReq.user = user

    const body = await req.json()
    const { templateId, siteId } = body

    if (!templateId || !siteId) {
      return NextResponse.json(
        { error: 'templateId and siteId are required', code: 'MISSING_PARAMS' },
        { status: 400 },
      )
    }

    let tenantId = getPrimaryTenantId(user)
    if (!tenantId) {
      if ((user as any).role === 'super-admin') {
        const site = await payload.findByID({
          collection: 'hosted-sites',
          id: siteId,
          overrideAccess: true,
        })
        tenantId = typeof site?.tenant === 'object' ? (site?.tenant as any)?.id : site?.tenant
      }
      if (!tenantId) {
        return NextResponse.json({ error: 'Tenant context not found' }, { status: 403 })
      }
    }

    const deploymentService = new DeploymentService(payload)
    const result = await deploymentService.deployTemplate({
      templateId,
      siteId,
      userId: user.id,
      tenantId,
    }, payloadReq)

    return NextResponse.json({
      success: true,
      deployment: result,
    })
  } catch (error: any) {
    console.error('Template deployment error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'DEPLOYMENT_ERROR' },
      { status: 500 },
    )
  }
}

