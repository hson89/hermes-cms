import type { Payload, PayloadRequest } from 'payload'

export interface BlockRegistrationPayload {
  name: string
  slug: string
  schema: any
  thumbnail?: string // Optional media ID
}

/**
 * Utility helper to safely retrieve nested dotted/array properties from an object (e.g. "slides[0].image" or "author.name").
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  // Normalize paths: slides[0].image -> slides.0.image
  const normalizedPath = path.replace(/\[(\w+)\]/g, '.$1')
  const keys = normalizedPath.split('.')
  let current = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = current[key]
  }
  return current
}

export class TemplateService {
  private payload: Payload

  constructor(payload: Payload) {
    this.payload = payload
  }

  /**
   * Registers a list of building blocks for a tenant.
   * Marking orphaned blocks as deprecated (FR-012).
   */
  async registerBlocks(tenantId: string | number, blocks: BlockRegistrationPayload[], req?: PayloadRequest) {
    // 1. Get existing blocks for this tenant
    const existingBlocks = await this.payload.find({
      collection: 'building-blocks' as any,
      where: {
        tenant: { equals: tenantId },
      },
      limit: 1000,
      overrideAccess: (req ? false : true) as any,
      req,
    })

    const existingSlugs = existingBlocks.docs.map((b: any) => b.slug)
    const incomingSlugs = blocks.map((b) => b.slug)

    // 2. Update or create blocks
    for (const block of blocks) {
      const existing = existingBlocks.docs.find((b: any) => b.slug === block.slug)
      if (existing) {
        // Update existing block (even if deprecated, reactivation)
        await this.payload.update({
          collection: 'building-blocks' as any,
          id: existing.id,
          data: {
            name: block.name,
            schema: block.schema,
            thumbnail: block.thumbnail,
            status: 'active',
          } as any,
          overrideAccess: (req ? false : true) as any,
          req,
        })
      } else {
        // Create new block
        await this.payload.create({
          collection: 'building-blocks' as any,
          data: {
            ...block,
            tenant: tenantId,
            status: 'active',
          } as any,
          overrideAccess: (req ? false : true) as any,
          req,
        })
      }
    }

    // 3. Mark orphaned as deprecated
    const orphanedSlugs = existingSlugs.filter((s) => !incomingSlugs.includes(s))
    for (const slug of orphanedSlugs) {
      const orphaned = existingBlocks.docs.find((b: any) => b.slug === slug)
      if (orphaned && orphaned.status !== 'deprecated') {
        await this.payload.update({
          collection: 'building-blocks' as any,
          id: orphaned.id,
          data: {
            status: 'deprecated',
          } as any,
          overrideAccess: (req ? false : true) as any,
          req,
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
  async resolveHydratedTree(templateId: string | number, contentItem: any, req?: PayloadRequest) {
    const template = await this.payload.findByID({
      collection: 'page-templates' as any,
      id: templateId,
      depth: 2, // Populate BuildingBlock info
      overrideAccess: (req ? false : true) as any,
      req,
    }) as any

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
          // Check for nested dotted path or direct key
          let value = getNestedValue(contentItem, contentField)
          if (value === undefined) {
            value = getNestedValue(fieldsData, contentField)
          }
          if (value !== undefined) {
            props[blockProp] = value
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
  async validateTemplateForDeployment(templateId: string | number, req?: PayloadRequest) {
    const template = await this.payload.findByID({
      collection: 'page-templates' as any,
      id: templateId,
      depth: 2,
      overrideAccess: (req ? false : true) as any,
      req,
    }) as any

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

  /**
   * Checks the health of all field mappings for a template.
   * R005: Schema Alignment.
   */
  async checkMappingHealth(templateId: string | number, req?: PayloadRequest) {
    const template = await this.payload.findByID({
      collection: 'page-templates' as any,
      id: templateId,
      depth: 2,
      overrideAccess: (req ? false : true) as any,
      req,
    }) as any

    if (!template || !template.contentType) return null

    const contentType = await this.payload.findByID({
      collection: 'content-types' as any,
      id: typeof template.contentType === 'object' ? template.contentType.id : template.contentType,
      overrideAccess: (req ? false : true) as any,
      req,
    }) as any

    if (!contentType) return null

    // Extract valid field names from the content type schema
    // In Hermes, schema is JSON following a specific structure (likely properties object)
    const validFields = new Set(Object.keys(contentType.schema?.properties || {}))
    
    const orphans: Record<string, string[]> = {}
    let hasOrphans = false

    ;(template.layout || []).forEach((instance: any) => {
      const mappings = instance.mappings || {}
      const blockOrphans: string[] = []

      Object.entries(mappings).forEach(([blockProp, contentField]) => {
        if (typeof contentField === 'string' && !validFields.has(contentField)) {
          blockOrphans.push(blockProp)
          hasOrphans = true
        }
      })

      if (blockOrphans.length > 0) {
        orphans[instance.instanceId] = blockOrphans
      }
    })

    // Update validation metadata
    await this.payload.update({
      collection: 'page-templates' as any,
      id: templateId,
      data: {
        validationMetadata: {
          hasOrphans,
          orphans,
          lastChecked: new Date().toISOString(),
        },
      } as any,
      overrideAccess: (req ? false : true) as any,
      req,
    })

    return { hasOrphans, orphans }
  }

  /**
   * Gets usage statistics for building blocks within a specific tenant.
   * R006: Multi-tenant Metric Security.
   */
  async getUsageStats(tenantId: string | number, req?: PayloadRequest) {
    const templates = await this.payload.find({
      collection: 'page-templates' as any,
      where: {
        tenant: { equals: tenantId },
      },
      limit: 1000,
      overrideAccess: (req ? false : true) as any,
      req,
    }) as any

    const stats: Record<string, number> = {}

    templates.docs.forEach((template: any) => {
      ;(template.layout || []).forEach((instance: any) => {
        const blockId = typeof instance.block === 'object' ? instance.block.id : instance.block
        if (blockId) {
          stats[blockId] = (stats[blockId] || 0) + 1
        }
      })
    })

    return stats
  }
}
