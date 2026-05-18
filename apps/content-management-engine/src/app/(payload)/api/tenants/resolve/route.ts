import { getPayload } from 'payload'
import config from '@/payload.config'
import { TenantService } from '@/services/tenant-service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/tenants/resolve
 * 
 * T019, T020 - Tenant resolution endpoint with secret validation.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hostname = searchParams.get('hostname')

  // 1. Validate Internal Secret
  const secret = req.headers.get('X-Internal-Secret')
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'hermes-internal-secret'

  if (secret !== internalSecret) {
    return NextResponse.json(
      { error: 'Internal authentication failed' },
      { status: 401 }
    )
  }

  if (!hostname) {
    return NextResponse.json(
      { error: 'Hostname is required', code: 'HOSTNAME_REQUIRED' },
      { status: 400 }
    )
  }

  try {
    const payload = await getPayload({ config })
    const tenantService = new TenantService(payload)

    const result = await tenantService.resolveTenantByHostname(hostname)

    if (!result) {
      return NextResponse.json(
        { error: 'Tenant not found', code: 'TENANT_NOT_RESOLVED' },
        { status: 404 }
      )
    }

    // 2. Validate Status
    const statusCheck = tenantService.validateTenantStatus(result.status)
    if (!statusCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Tenant access blocked', 
          code: statusCheck.code,
          status: result.status 
        },
        { status: 403 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Tenant resolution error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
