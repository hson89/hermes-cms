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

    if (!session || String(sessionUserId) !== String(user.id)) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
    }

    const tenantId = session.tenant 
      ? (typeof session.tenant === 'object' ? (session.tenant as any).id : session.tenant)
      : null;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Cannot promote session without an associated Tenant.' },
        { status: 400 }
      )
    }

    let contentTypeId = session.contentType 
      ? (typeof session.contentType === 'object' ? (session.contentType as any).id : session.contentType)
      : null;

    if (!contentTypeId) {
      // Automatically generate a dynamic Content Type schema based on current draftData!
      const draftData = (session.draftData as any) || {}
      const pageTitle = draftData.title || draftData.name || draftData.headline || 'AI Drafted Page'
      const name = `${pageTitle} Schema`
      
      const fields = Object.keys(draftData)
        .filter(key => key !== 'title' && key !== 'content' && key !== 'status' && key !== 'tenant' && key !== 'contentType')
        .map(key => {
          const val = draftData[key]
          let type = 'text'
          if (typeof val === 'number') type = 'number'
          else if (typeof val === 'boolean') type = 'boolean'
          else if (typeof val === 'object' && val !== null) type = 'json'

          const label = key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())

          return {
            name: key,
            type,
            label,
            required: false
          }
        })

      const newContentType = await payload.create({
        collection: 'content-types',
        data: {
          name,
          slug: `ai-draft-${Date.now()}`,
          status: 'published',
          schema: {
            fields
          },
          tenant: tenantId,
          generatedByAI: true,
          version: 1,
        },
        draft: false,
      })

      contentTypeId = newContentType.id
    }

    // 2. Create the ContentItem
    const draftData = (session.draftData as any) || {}
    const title = draftData.title || draftData.name || draftData.headline || 'Untitled AI Draft'
    const content = draftData.content || null

    const contentItem = await payload.create({
      collection: 'content-items',
      data: {
        title,
        content,
        fieldsData: draftData,
        contentType: contentTypeId,
        tenant: tenantId,
        status: 'draft',
      },
    })

    // 3. Atomically delete the session
    await payload.delete({
      collection: 'drafting-sessions',
      id,
    })

    return NextResponse.json(contentItem)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
