import type { CollectionConfig } from 'payload'
import { getTenantIds } from './utils'

/**
 * APIKeys collection.
 * Allows tenant admins to create long-lived API keys for programmatic
 * content delivery access (e.g., frontend SSG builds, CI/CD pipelines).
 *
 * T011 - Setup base Payload Auth collections (APIKeys)
 */
export const APIKeys: CollectionConfig = {
  slug: 'api-keys',
  auth: {
    // Use API key authentication strategy for this collection.
    useAPIKey: true,
    depth: 0,
    tokenExpiration: 60 * 60 * 24 * 365, // 1 year
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  },
  admin: {
    useAsTitle: 'label',
    description: 'API keys for programmatic content delivery access.',
  },
  access: {
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
    create: ({ req: { user } }) => !!user,
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
    delete: ({ req: { user } }) => {
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
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      label: 'Label',
      admin: {
        description: 'A human-readable name for this API key.',
      },
    },

    {
      name: 'expiresAt',
      type: 'date',
      label: 'Expires At',
      admin: {
        description: 'Optional expiry date. Leave empty for no expiry.',
      },
    },
  ],
  timestamps: true,
}
