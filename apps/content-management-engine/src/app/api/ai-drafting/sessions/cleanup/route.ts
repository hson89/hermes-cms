import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-drafting/sessions/cleanup
 * System cleanup route for expired sessions and rate limits.
 * Protected by X-Internal-Secret.
 * Satisfies T044.
 */
export async function POST(req: NextRequest) {
  const internalSecret = req.headers.get('X-Internal-Secret')
  if (internalSecret !== process.env.INTERNAL_SERVICE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })
  const now = new Date()
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()

  try {
    // 1. Expire inactive sessions (active -> expired if inactive > 10m)
    const inactiveSessions = await payload.find({
      collection: 'drafting-sessions',
      where: {
        and: [
          {
            status: { equals: 'active' },
          },
          {
            lastActivityAt: { less_than: tenMinutesAgo },
          },
        ],
      },
      overrideAccess: true,
    })

    for (const session of inactiveSessions.docs) {
      await payload.update({
        collection: 'drafting-sessions',
        id: session.id,
        data: { status: 'expired' },
        overrideAccess: true,
      })
    }

    // 2. Delete old expired sessions (> 24h)
    await payload.delete({
      collection: 'drafting-sessions',
      where: {
        and: [
          {
            status: { equals: 'expired' },
          },
          {
            updatedAt: { less_than: twentyFourHoursAgo },
          },
        ],
      },
      overrideAccess: true,
    })

    // 3. Delete old rate limit logs (> 5m)
    await payload.delete({
      collection: 'ai-rate-limits',
      where: {
        timestamp: { less_than: fiveMinutesAgo },
      },
      overrideAccess: true,
    })

    return NextResponse.json({ 
      success: true, 
      expired: inactiveSessions.docs.length 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
