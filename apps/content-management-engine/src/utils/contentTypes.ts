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
