import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-drafting/sessions/[id]/promote
 * Promotes a draft to a permanent ContentItem.
 * Satisfies T025.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth(req)
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch the session
    const session = await payload.findByID({
      collection: 'drafting-sessions',
      id,
    })

    const sessionUserId = typeof session.user === 'object' ? (session.user as any).id : session.user

    if (!session || sessionUserId !== user.id) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
    }

    // 2. Create the ContentItem
    // Spread draftData to ensure all AI-generated fields (including custom ones) are preserved.
    const draftData = session.draftData as any
    const contentItem = await payload.create({
      collection: 'content-items',
      data: {
        ...draftData,
        title: draftData.title || 'Untitled AI Draft',
        slug: draftData.slug || `draft-${Date.now()}`,
        contentType: (session.contentType as any).id || session.contentType,
        tenant: (session.tenant as any).id || session.tenant,
        status: 'draft',
      },
    })

    // 3. Atomically delete the session (or mark as promoted)
    await payload.delete({
      collection: 'drafting-sessions',
      id,
    })

    return NextResponse.json(contentItem)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
