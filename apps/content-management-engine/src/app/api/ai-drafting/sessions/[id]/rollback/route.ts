import { getPayload } from 'payload'
import config from '@/payload.config'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ai-drafting/sessions/[id]/rollback
 * Restores a drafting session to a historical version.
 * Satisfies T045.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth(req)
  const { id } = params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { versionIndex } = await req.json()

  try {
    const session = await payload.findByID({
      collection: 'drafting-sessions',
      id,
    })

    if (!session || (session.user as any).id !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const versions = session.versions as any[]
    if (!versions || versionIndex < 0 || versionIndex >= versions.length) {
      return NextResponse.json({ error: 'Invalid version index' }, { status: 400 })
    }

    const targetVersion = versions[versionIndex]

    // Restore draftData from selected version
    const updatedSession = await payload.update({
      collection: 'drafting-sessions',
      id,
      data: {
        draftData: targetVersion.draftData,
      },
      overrideAccess: true,
    })

    return NextResponse.json(updatedSession)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
