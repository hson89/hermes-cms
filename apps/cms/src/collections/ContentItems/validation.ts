import type { Payload } from 'payload'

export interface ValidationError {
  field: string
  message: string
}

/**
 * Dynamic content validator.
 * Validates dynamic document fieldsData properties against ContentType schema field specifications.
 * Enforces logical tenant boundary scopes on unique field checks (FR-005).
 */
export async function validateContentItem(
  fieldsData: Record<string, any>,
  schema: any,
  tenantId: string,
  payload: Payload,
  currentItemId?: string | number
): Promise<ValidationError[]> {
  const errors: ValidationError[] = []

  if (!schema || !Array.isArray(schema.fields)) {
    return errors
  }

  for (const field of schema.fields) {
    const value = fieldsData?.[field.name]

    // 1. Required Check
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" is required.`,
        })
        continue
      }
    }

    // Skip further checks if the value is empty/absent
    if (value === undefined || value === null || value === '') {
      continue
    }

    // 2. Type Check
    if (field.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a number.`,
        })
      }
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be a boolean.`,
        })
      }
    }

    // 3. Select Options Check
    if (field.type === 'select' && Array.isArray(field.options)) {
      if (!field.options.includes(value)) {
        errors.push({
          field: field.name,
          message: `Field "${field.name}" must be one of: ${field.options.join(', ')}.`,
        })
      }
    }

    // 4. Uniqueness Check (Scoped strictly to the current tenant - FR-005)
    if (field.unique) {
      try {
        const query = {
          collection: 'content-items' as const,
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { [`fieldsData.${field.name}`]: { equals: value } }
            ]
          },
          limit: 1,
          overrideAccess: true,
        }

        const duplicateCheck = await payload.find(query)

        if (duplicateCheck.docs.length > 0) {
          const duplicateDoc = duplicateCheck.docs[0]
          // Ignore matching document ID when updating
          if (currentItemId === undefined || String(duplicateDoc.id) !== String(currentItemId)) {
            errors.push({
              field: field.name,
              message: `Value "${value}" for unique field "${field.name}" is already taken.`,
            })
          }
        }
      } catch (err) {
        console.error(`Uniqueness validation check failed for field "${field.name}":`, err)
      }
    }
  }

  return errors
}
