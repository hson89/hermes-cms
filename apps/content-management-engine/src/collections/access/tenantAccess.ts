import { Access, Where } from 'payload'
import { getTenantIds } from '../Users/utils'

export const tenantAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'super-admin') return true

  const tenantIds = getTenantIds(user)
  if (tenantIds.length === 0) return false

  return {
    tenant: {
      in: tenantIds,
    },
  }
}
