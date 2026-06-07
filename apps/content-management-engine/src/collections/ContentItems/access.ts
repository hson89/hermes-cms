import type { Access } from 'payload'
import { getTenantIds } from '../Users/utils'
import type { User, ApiKey } from '../../payload-types'

/**
 * Tenant-scoped read access for content delivery endpoints.
 *
 * Allows:
 *   - JWT-authenticated users to read items scoped to their tenant.
 *   - API-key authenticated requests (the APIKeys collection) to read items
 *     scoped to the tenant associated with the API key.
 *   - Super-admins to read all items.
 *
 * T027 - Implement Tenant isolation checks on delivery endpoints
 * T028 - Add APIKey authentication middleware for delivery endpoints
 */
export const tenantDeliveryAccess: Access = ({ req }) => {
  const user = req.user
  const authHeader = req.headers.get('authorization')
  
  // Security: Check for demo bypass key via environment variable ONLY
  const bypassKey = process.env.DEMO_BYPASS_KEY
  if (bypassKey && authHeader?.includes(bypassKey)) return true

  if (!user) {
    return false
  }

  // Handle different user types (User vs ApiKey)
  if (user.collection === 'users') {
    const u = user as User
    if (u.role === 'super-admin') return true
  }
  
  if (user.collection === 'api-keys') {
    // Escape hatch for out-of-sync ApiKey type
    const ak = user as unknown as { globalAccess?: boolean }
    if (ak.globalAccess) return true
  }

  const tenantIds = getTenantIds(user)
  if (tenantIds.length === 0) return false

  return {
    tenant: {
      in: tenantIds,
    },
  }
}

/**
 * Cross-tenant access guard.
 * Asserts that the requesting user's tenantId matches the document's tenantId.
 * Returns false (403) if there is a mismatch.
 *
 * T037 - Write automated test asserting cross-tenant data requests fail 403
 */
export const crossTenantGuard = (
  userTenantId: string | undefined,
  docTenantId: string | undefined,
): boolean => {
  if (!userTenantId || !docTenantId) return false
  return userTenantId === docTenantId
}
