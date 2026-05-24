import { BasePayload } from 'payload'

export interface BlockRegistrationPayload {
  name: string
  slug: string
  schema: any
  thumbnail?: string // Optional media ID
}

export class TemplateService {
  private payload: BasePayload

  constructor(payload: BasePayload) {
    this.payload = payload
  }

  /**
   * Registers a list of building blocks for a tenant.
   * Marking orphaned blocks as deprecated (FR-012).
   */
  async registerBlocks(tenantId: string | number, blocks: BlockRegistrationPayload[]) {
    // 1. Get existing blocks for this tenant
    const existingBlocks = await this.payload.find({
      collection: 'building-blocks',
      where: {
        tenant: { equals: tenantId },
      },
      limit: 1000,
    })

    const existingSlugs = existingBlocks.docs.map((b: any) => b.slug)
    const incomingSlugs = blocks.map((b) => b.slug)

    // 2. Update or create blocks
    for (const block of blocks) {
      const existing = existingBlocks.docs.find((b: any) => b.slug === block.slug)
      if (existing) {
        // Update existing block (even if deprecated, reactivation)
        await this.payload.update({
          collection: 'building-blocks',
          id: existing.id,
          data: {
            name: block.name,
            schema: block.schema,
            thumbnail: block.thumbnail,
            status: 'active',
          },
        })
      } else {
        // Create new block
        await this.payload.create({
          collection: 'building-blocks',
          data: {
            ...block,
            tenant: tenantId,
            status: 'active',
          },
        })
      }
    }

    // 3. Mark orphaned as deprecated
    const orphanedSlugs = existingSlugs.filter((s) => !incomingSlugs.includes(s))
    for (const slug of orphanedSlugs) {
      const orphaned = existingBlocks.docs.find((b: any) => b.slug === slug)
      if (orphaned && orphaned.status !== 'deprecated') {
        await this.payload.update({
          collection: 'building-blocks',
          id: orphaned.id,
          data: {
            status: 'deprecated',
          },
        })
      }
    }

    return {
      registered: blocks.length,
      deprecated: orphanedSlugs.length,
    }
  }

  /**
   * Resolves a hydrated block tree for a template and a content item.
   * FR-011: Resolution Engine.
   *
   * Offloads the "joining" of Content Item data and Template layout to the server.
   */
  async resolveHydratedTree(templateId: string | number, contentItem: any) {
    const template = await this.payload.findByID({
      collection: 'page-templates',
      id: templateId,
      depth: 2, // Populate BuildingBlock info
    })

    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const hydratedBlocks = (template.layout || []).map((instance: any) => {
      const block = instance.block
      const mappings = instance.mappings || {}
      const props: Record<string, any> = {}

      // Map block properties to content item fields
      // mappings is { "blockProperty": "contentTypeField" }
      const fieldsData = contentItem.fieldsData || {}
      
      Object.entries(mappings).forEach(([blockProp, contentField]) => {
        if (typeof contentField === 'string') {
          // Check in top level or fieldsData
          if (contentField in contentItem) {
            props[blockProp] = contentItem[contentField]
          } else if (contentField in fieldsData) {
            props[blockProp] = fieldsData[contentField]
          }
        }
      })

      return {
        block: {
          id: block.id,
          name: block.name,
          slug: block.slug,
        },
        props,
      }
    })

    return hydratedBlocks
  }

  /**
   * Validates a template before deployment.
   * FR-009: Pre-deployment Validation.
   * Checks for empty layouts and missing required mappings.
   */
  async validateTemplateForDeployment(templateId: string | number) {
    const template = await this.payload.findByID({
      collection: 'page-templates',
      id: templateId,
      depth: 2,
    })

    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const errors: string[] = []

    if (!template.layout || template.layout.length === 0) {
      errors.push('Template layout is empty')
    }

    ;(template.layout || []).forEach((instance: any, index: number) => {
      const block = instance.block
      const mappings = instance.mappings || {}
      const blockSchema = block.schema?.properties || {}

      const requiredProps = Object.keys(blockSchema).filter((p) => blockSchema[p].required)

      requiredProps.forEach((prop) => {
        if (!mappings[prop]) {
          errors.push(`Block #${index + 1} (${block.name}): Required property '${prop}' is not mapped.`)
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
