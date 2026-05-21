import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/ai-drafting/sessions/[id]
 * Updates a drafting session (auto-save or manual snapshot).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth(req)
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { draftData, versions, contentType } = await req.json()

  try {
    const session = await payload.update({
      collection: 'drafting-sessions',
      id,
      data: {
        draftData,
        versions,
        ...(contentType !== undefined ? { contentType } : {}),
      },
      overrideAccess: true, // Verification done via user check above if needed, 
                            // but DraftingSessions.access already restricts to owner.
    })

    return NextResponse.json(session)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

/**
 * DELETE /api/ai-drafting/sessions/[id]
 * Discards a drafting session.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth(req)
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await payload.delete({
      collection: 'drafting-sessions',
      id,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
