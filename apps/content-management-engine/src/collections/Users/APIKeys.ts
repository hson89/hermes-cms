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
  labels: {
    singular: 'API Key',
    plural: 'API Keys',
  },
  auth: {
    // Use API key authentication strategy for this collection.
    useAPIKey: true,
    disableLocalStrategy: true,
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
    components: {
      views: {
        list: {
          Component: '/src/components/views/APIKeyListPage#APIKeyListPage',
        },
        edit: {
          default: {
            Component: '/src/components/views/CreateAPIKeyPage#CreateAPIKeyPage',
          },
        },
      },
    },
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
    admin: ({ req: { user } }) => {
      if (!user) return false
      return (
        (user as any).role === 'super-admin' ||
        (user as any).role === 'tenant-admin'
      )
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
      name: 'email',
      type: 'email',
      required: true,
      label: 'Owner Email Address',
      admin: {
        description: 'Identifier email address associated with this API key.',
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
    {
      name: 'globalAccess',
      type: 'checkbox',
      defaultValue: false,
      label: 'Global Frontend Access',
      admin: {
        description: 'If enabled, this key can read content items across all tenants (useful for multi-tenant frontend portals).',
        position: 'sidebar',
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
