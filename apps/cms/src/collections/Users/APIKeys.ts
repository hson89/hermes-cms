import type { CollectionConfig } from 'payload'

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
      return {
        tenantId: {
          exists: true, // Placeholder or real scoping
        },
      }
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user && (user as any).role === 'super-admin',
    delete: ({ req: { user } }) => !!user && (user as any).role === 'super-admin',
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
      name: 'tenantId',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Tenant',
      admin: {
        description: 'The tenant this API key grants access to.',
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
