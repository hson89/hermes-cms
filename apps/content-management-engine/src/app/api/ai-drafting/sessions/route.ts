import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'
import { isRateLimited } from '@/services/rate-limiter'
import crypto from 'crypto'

/**
 * GET /api/ai-drafting/sessions
 * Checks for active session locks and returns status.
 * Satisfies T019, addressing Review feedback for tenant ambiguity.
 */
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth(req)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting check
  if (await isRateLimited(String(user.id), payload)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const contentType = searchParams.get('contentType')
  const requestedTenantId = searchParams.get('tenantId')

  // Security: Verify user has access to requested tenant
  const userTenants = (user as any).tenants?.map((t: any) => t.tenant?.id || t.tenant) || []
  const hasAccess = (user as any).role === 'super-admin' || 
    userTenants.some((tid: any) => String(tid) === String(requestedTenantId))
  
  if (!hasAccess && requestedTenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = requestedTenantId || userTenants[0]

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  // Check for active sessions (including on-the-fly expiry)
  const sessions = await payload.find({
    collection: 'drafting-sessions',
    where: {
      and: [
        {
          tenant: {
            equals: tenantId,
          },
        },
        {
          contentType: {
            equals: contentType || null,
          },
        },
        {
          status: {
            equals: 'active',
          },
        },
      ],
    },
    user,
    overrideAccess: false,
  })

  let activeSession = null
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)

  for (const session of sessions.docs) {
    const lastActivity = new Date(session.lastActivityAt)
    if (lastActivity < tenMinutesAgo) {
      // Transition expired session
      await payload.update({
        collection: 'drafting-sessions',
        id: session.id,
        data: {
          status: 'expired',
        },
        user,
        overrideAccess: false,
      })
    } else {
      activeSession = session
    }
  }

  if (activeSession && !(activeSession as any).aiSessionId) {
    const newAiSessionId = crypto.randomUUID()
    const updated = await payload.update({
      collection: 'drafting-sessions' as never,
      id: activeSession.id,
      data: {
        aiSessionId: newAiSessionId,
      } as never,
      user,
      overrideAccess: false,
    })
    activeSession = updated as any
  }

  return NextResponse.json({
    activeSession,
  })
}

/**
 * POST /api/ai-drafting/sessions
 * Starts a new drafting session.
 */
export async function POST(req: NextRequest) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth(req)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contentType, locale = 'en', tenantId: requestedTenantId } = await req.json()
  
  // Security check
  const userTenants = (user as any).tenants?.map((t: any) => t.tenant?.id || t.tenant) || []
  const hasAccess = (user as any).role === 'super-admin' || 
    userTenants.some((tid: any) => String(tid) === String(requestedTenantId))
  
  if (!hasAccess && requestedTenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const tenantId = requestedTenantId || userTenants[0]

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  // Create the session
  try {
    const session = await payload.create({
      collection: 'drafting-sessions' as never,
      data: {
        user: user.id,
        tenant: tenantId,
        contentType,
        activeLocale: locale,
        status: 'active',
        draftData: {},
        lastActivityAt: new Date().toISOString(),
        aiSessionId: crypto.randomUUID(),
      } as never,
      user,
      overrideAccess: false,
    })

    return NextResponse.json(session)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
