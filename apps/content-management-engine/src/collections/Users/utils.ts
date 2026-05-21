import type { User } from '../../payload-types'

/**
 * Extracts tenant IDs from a user object.
 * Handles the plural 'tenants' array injected by the multi-tenant plugin.
 */
export const getTenantIds = (user: any): (string | number)[] => {
  if (!user) return []
  if (user.role === 'super-admin') return [] // Super admins don't need filtering

  if (Array.isArray(user.tenants)) {
    return user.tenants
      .map((t: any) => {
        if (!t) return undefined
        if (typeof t === 'string' || typeof t === 'number') return t
        return typeof t.tenant === 'object' ? t.tenant?.id : t.tenant
      })
      .filter((id): id is string | number => id !== undefined && id !== null)
  }

  // Fallback for API keys or users with a single tenant relationship
  if (user.tenant) {
    return [typeof user.tenant === 'object' ? user.tenant.id : user.tenant]
  }

  // Fallback for legacy or misconfigured users
  if (user.tenantId) {
    return [typeof user.tenantId === 'object' ? user.tenantId.id : user.tenantId]
  }

  return []
}

/**
 * Gets a single primary tenant ID for a user.
 */
export const getPrimaryTenantId = (user: any): string | number | undefined => {
  const ids = getTenantIds(user)
  return ids.length > 0 ? ids[0] : undefined
}
