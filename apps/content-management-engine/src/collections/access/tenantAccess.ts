import { Access, Where } from 'payload'
import { getTenantIds } from '../Users/utils'
import type { User, ApiKey } from '../../payload-types'

export const tenantAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  
  // Use safer casting to check role if it's a User
  const u = user as User
  if (u.role === 'super-admin') return true

  const tenantIds = getTenantIds(user)
  if (tenantIds.length === 0) return false

  return {
    tenant: {
      in: tenantIds,
    },
  }
}

export const tenantReadAccess: Access = ({ req }) => {
  const user = req.user
  
  // Security: Check for demo bypass key via environment variable ONLY
  const authHeader = req.headers?.get?.('authorization')
  const bypassKey = process.env.DEMO_BYPASS_KEY
  if (bypassKey && authHeader?.includes(bypassKey)) return true
  
  if (!user) return false
  
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

