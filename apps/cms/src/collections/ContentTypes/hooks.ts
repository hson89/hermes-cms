import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Helper to safely extract headers across different environments/mock states.
 */
function getHeader(headersObj: any, name: string): string | null {
  if (!headersObj) return null
  if (typeof headersObj.get === 'function') {
    return headersObj.get(name)
  }
  return headersObj[name] || headersObj[name.toLowerCase()] || null
}

/**
 * Collection hooks for ContentTypes.
 * Implements schema constraints, destructive change checks, and optimistic concurrency.
 */
export const beforeChangeHook: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
  operation,
}) => {
  const { payload } = req

  // 1. Optimistic Concurrency Check (T022)
  if (operation === 'update' && originalDoc?.updatedAt) {
    const unmodifiedSinceHeader = getHeader(req.headers, 'if-unmodified-since')
    if (unmodifiedSinceHeader) {
      const clientTime = new Date(unmodifiedSinceHeader).getTime()
      const dbTime = new Date(originalDoc.updatedAt).getTime()

      // Allow 1s tolerance for date precision conversion discrepancies and clock skew in either direction
      if (Math.abs(dbTime - clientTime) > 1000) {
        throw new Error(
          'Precondition Failed: The Content Type was modified by another user. Please reload and try again.'
        )
      }
    }
  }

  // 2. Uniqueness Validation of ContentType slug per tenant (FR-005)
  if (data?.slug && data?.tenant) {
    const duplicateCheck = await payload.find({
      collection: 'content-types' as any,
      where: {
        and: [
          { tenant: { equals: data.tenant } },
          { slug: { equals: data.slug } }
        ]
      },
      limit: 1,
      overrideAccess: true,
    })

    if (duplicateCheck.docs.length > 0) {
      const duplicateDoc = duplicateCheck.docs[0]
      if (operation === 'create' || String(duplicateDoc.id) !== String(originalDoc?.id)) {
        throw new Error(`A Content Type with slug "${data.slug}" already exists for this tenant.`)
      }
    }
  }

  // 3. Prevent duplicate field names within the same schema (FR-005)
  if (data?.schema?.fields && Array.isArray(data.schema.fields)) {
    const seenFields = new Set<string>()
    for (const field of data.schema.fields) {
      if (!field.name) continue
      if (seenFields.has(field.name)) {
        throw new Error(`Duplicate field name "${field.name}" detected in schema definition.`)
      }
      seenFields.add(field.name)
    }
  }

  // 4. Destructive Modification Protection (T021)
  if (operation === 'update' && originalDoc?.id && data?.schema?.fields) {
    // Check if any Content Items already exist for this Content Type
    const itemsCheck = await payload.find({
      collection: 'content-items' as any,
      where: {
        contentType: { equals: originalDoc.id }
      },
      limit: 1,
      overrideAccess: true,
    })

    const hasContentItems = itemsCheck.docs.length > 0

    if (hasContentItems) {
      const originalFields = originalDoc.schema?.fields || []
      const incomingFields = data.schema.fields

      // A. Block field deletion
      for (const origField of originalFields) {
        const stillExists = incomingFields.some((f: any) => f.name === origField.name)
        if (!stillExists) {
          throw new Error(
            `Cannot delete field "${origField.name}" because existing Content Items depend on this Content Type.`
          )
        }
      }

      // B. Block adding new required fields without default value
      for (const incomingField of incomingFields) {
        const isNew = !originalFields.some((f: any) => f.name === incomingField.name)
        if (isNew && incomingField.required) {
          const hasDefault = incomingField.defaultValue !== undefined && incomingField.defaultValue !== null && incomingField.defaultValue !== ''
          if (!hasDefault) {
            throw new Error(
              `Required field "${incomingField.name}" cannot be added without a defaultValue because existing Content Items exist.`
            )
          }
        }
      }
    }
  }

  return data
}
