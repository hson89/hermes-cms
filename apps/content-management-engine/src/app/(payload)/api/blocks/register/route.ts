import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateService } from '@/services/template_service'
import { NextRequest, NextResponse } from 'next/server'
import { getPrimaryTenantId } from '@/collections/Users/utils'

/**
 * POST /api/blocks/register
 *
 * FR-006: Block Registry API
 * Allows frontend applications to register their building blocks with the CMS.
 * Supports multi-tenant isolation and block deprecation (FR-012).
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: await config })

    // 1. Auth Check
    // We expect "Authorization: api-keys API-Key <key>" or a user session
    const authHeader = req.headers.get('Authorization')
    let user = (req as any).user

    if (!user && authHeader) {
      // Manual API Key check if not automatically populated by Payload middleware in this custom route
      const match = authHeader.match(/^api-keys API-Key (.+)$/)
      if (match) {
        const apiKey = match[1]
        const apiKeys = await payload.find({
          collection: 'api-keys',
          where: {
            apiKey: { equals: apiKey },
          },
          // @ts-ignore - apiKey field is added by Payload auth
          overrideAccess: true,
        })
        if (apiKeys.docs.length > 0) {
          user = apiKeys.docs[0]
          user.collection = 'api-keys'
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = getPrimaryTenantId(user)
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 403 })
    }

    // 2. Process Registration
    const body = await req.json()
    const { blocks } = body

    if (!Array.isArray(blocks)) {
      return NextResponse.json(
        { error: 'Invalid payload: blocks array required', code: 'INVALID_PAYLOAD' },
        { status: 400 },
      )
    }

    const templateService = new TemplateService(payload)
    const result = await templateService.registerBlocks(tenantId, blocks, req as any)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Block registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
