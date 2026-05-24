import type { CollectionConfig } from 'payload'
import { getTenantIds } from '../Users/utils'

/**
 * JWTTokens collection.
 * Tracks cryptographic hashes of issued marketplace tokens for revocation and audit.
 * Strictly multi-tenant isolated.
 */
export const JWTTokens: CollectionConfig = {
  slug: 'jwt-tokens',
  admin: {
    useAsTitle: 'tokenHash',
    description: 'Registry of issued marketplace tokens (hashes).',
    group: 'Marketplace',
    defaultColumns: ['tokenHash', 'tenant', 'appId', 'expiresAt', 'isRevoked'],
    components: {
      views: {
        list: {
          Component: '/src/components/views/JWTTokenListPage#JWTTokenListPage',
        },
      },
    },
  },
  access: {
    // Only admins of the tenant or super-admins can read their own token hashes
    read: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      const tenantIds = getTenantIds(user)
      if (tenantIds.length === 0) return false
      return {
        tenant: {
          in: tenantIds,
        },
      }
    },
    // Tokens are created programmatically via the generate-token endpoint (using overrideAccess)
    // or by super-admins.
    create: ({ req: { user } }) => (user as any)?.role === 'super-admin',
    // Revocation can be done by tenant admins
    update: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      const tenantIds = getTenantIds(user)
      if (tenantIds.length === 0) return false
      return {
        tenant: {
          in: tenantIds,
        },
      }
    },
    delete: ({ req: { user } }) => (user as any)?.role === 'super-admin',
  },
  fields: [
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Token Hash (SHA-256)',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      label: 'Tenant',
    },
    {
      name: 'appId',
      type: 'relationship',
      relationTo: 'marketplace-apps' as any,
      required: true,
      label: 'Marketplace App',
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'Expiration Date',
    },
    {
      name: 'isRevoked',
      type: 'checkbox',
      defaultValue: false,
      label: 'Revoked',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'scopes',
      type: 'array',
      label: 'Authorized Scopes',
      fields: [
        {
          name: 'scope',
          type: 'text',
        },
      ],
    },
  ],
  timestamps: true,
}
