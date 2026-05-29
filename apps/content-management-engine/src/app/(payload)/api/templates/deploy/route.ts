import { getPayload } from 'payload'
import config from '@/payload.config'
import { DeploymentService } from '@/services/deployment_service'
import { NextRequest, NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPrimaryTenantId } from '@/collections/Users/utils'

/**
 * POST /api/templates/deploy
 *
 * Triggers the deployment of a template to a specific HostedSite.
 */
export async function POST(req: NextRequest) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: await config })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = getPrimaryTenantId(user)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 403 })
    }

    const body = await req.json()
    const { templateId, siteId } = body

    if (!templateId || !siteId) {
      return NextResponse.json(
        { error: 'templateId and siteId are required', code: 'MISSING_PARAMS' },
        { status: 400 },
      )
    }

    const deploymentService = new DeploymentService(payload)
    const result = await deploymentService.deployTemplate({
      templateId,
      siteId,
      userId: user.id,
      tenantId,
    })

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
