/**
 * Constructs the query string parameters to fetch content types that are either
 * scoped to the active tenant or globally available (isGlobal = true).
 *
 * @param tenantId The current tenant ID
 * @param limit The maximum number of documents to retrieve
 * @returns A query string formatted for the Payload CMS REST API
 */
export function getTenantAndGlobalContentTypesQuery(
  tenantId: string | number | undefined,
  limit = 100
): string {
  if (!tenantId) {
    return `where[isGlobal][equals]=true&limit=${limit}`
  }
  return `where[or][0][tenant][equals]=${tenantId}&where[or][1][isGlobal][equals]=true&limit=${limit}`
}

/**
 * Merges a newly updated Content Type and a list of alternative Content Types
 * into the current state array of all content types, ensuring uniqueness by ID.
 *
 * @param prev The current list of Content Types in state
 * @param newCT The new/updated Content Type received from the AI
 * @param altList Optional list of alternatives provided by the AI
 */
export function mergeContentTypes(
  prev: any[],
  newCT: any,
  altList?: any[]
): any[] {
  // Start with the pre-fetched list (which may include more CTs than the AI returned)
  const base = prev.length > 0 ? prev : (altList && altList.length > 0 ? [newCT, ...altList] : [newCT])
  // Ensure newCT is in the list
  const withNewCT = base.some(c => String(c?.id) === String(newCT?.id))
    ? base.map(c => String(c?.id) === String(newCT?.id) ? newCT : c)
    : [newCT, ...base]
  // Merge in AI-provided altList entries that aren't already present
  if (altList && altList.length > 0) {
    const merged = [...withNewCT]
    for (const alt of altList) {
      if (alt && !merged.some(c => String(c?.id) === String(alt?.id))) {
        merged.push(alt)
      }
    }
    return merged
  }
  return withNewCT
}

