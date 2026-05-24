import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateService } from '@/services/template_service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/content/[id]/hydrate
 *
 * FR-011: Resolution Engine Delivery
 * Fetches the hydrated block tree for a specific content item by joining
 * its data with the associated Page Template.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const contentId = params.id

  try {
    const payload = await getPayload({ config: await config })

    // 1. Get Content Item
    const contentItem = await payload.findByID({
      collection: 'content-items',
      id: contentId,
    })

    if (!contentItem) {
      return NextResponse.json(
        { error: 'Content item not found', code: 'CONTENT_NOT_FOUND' },
        { status: 404 },
      )
    }

    // 2. Find associated Page Template via Content Type
    // ContentItems.contentType is a relationship
    const contentTypeId =
      typeof contentItem.contentType === 'object'
        ? contentItem.contentType.id
        : contentItem.contentType

    const templates = await payload.find({
      collection: 'page-templates',
      where: {
        contentType: { equals: contentTypeId },
        status: { equals: 'published' },
      },
      limit: 1,
    })

    if (templates.docs.length === 0) {
      return NextResponse.json(
        {
          error: 'No published template found for this content type',
          code: 'TEMPLATE_NOT_FOUND',
        },
        { status: 404 },
      )
    }

    const template = templates.docs[0]

    // 3. Resolve Hydrated Tree
    const templateService = new TemplateService(payload)
    const hydratedBlocks = await templateService.resolveHydratedTree(
      template.id,
      contentItem,
    )

    return NextResponse.json({
      content: {
        id: contentItem.id,
        title: contentItem.title,
        status: contentItem.status,
      },
      template: {
        id: template.id,
        name: template.name,
      },
      blocks: hydratedBlocks,
    })
  } catch (error) {
    console.error('Hydration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}
