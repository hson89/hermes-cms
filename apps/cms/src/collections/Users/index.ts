import type { CollectionConfig } from 'payload'

/**
 * Users collection.
 * Extends Payload's built-in auth to include tenant affiliation and role.
 *
 * T011 - Setup base Payload Auth collections (Users)
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    description: 'CMS users, each belonging to a single tenant.',
  },
  access: {
    // Super-admins can do everything. Tenant members manage their own workspace.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'super-admin') return true
      return {
        tenantId: {
          equals: user.tenantId,
        },
      }
    },
    create: ({ req: { user } }) =>
      user?.role === 'super-admin' || user?.role === 'tenant-admin',
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'super-admin') return true
      return {
        tenantId: {
          equals: user.tenantId,
        },
      }
    },
    delete: ({ req: { user } }) => user?.role === 'super-admin',
  },
  fields: [
    {
      name: 'tenantId',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      label: 'Tenant',
      admin: {
        description: 'The tenant this user belongs to. Empty for super-admins.',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      label: 'Role',
      options: [
        { label: 'Super Admin', value: 'super-admin' },
        { label: 'Tenant Admin', value: 'tenant-admin' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
  timestamps: true,
}
