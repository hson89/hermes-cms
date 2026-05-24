import type { CollectionConfig } from 'payload'
import { getTenantIds } from '../Users/utils'

/**
 * TenantApps collection.
 * Tracks 3rd-party app installations per tenant.
 * Strictly multi-tenant isolated.
 */
export const TenantApps: CollectionConfig = {
  slug: 'tenant-apps',
  admin: {
    useAsTitle: 'app',
    description: 'Installations of marketplace apps for your organization.',
    group: 'Marketplace',
    defaultColumns: ['app', 'tenant', 'status', 'installedAt'],
    components: {
      views: {
        list: {
          Component: '/src/components/views/TenantAppListPage#TenantAppListPage',
        },
        edit: {
          default: {
            Component: '/src/components/views/TenantAppEditPage#TenantAppEditPage',
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
    create: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      return (user as any).role === 'admin' // Only tenant admins can install apps
    },
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
      name: 'app',
      type: 'relationship',
      relationTo: 'marketplace-apps' as any,
      required: true,
      label: 'Marketplace App',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      label: 'Tenant',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'config',
      type: 'json',
      label: 'Setup Parameters',
      admin: {
        description: 'App-specific configuration and secrets for this installation.',
      },
    },
    {
      name: 'installedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ value, operation }) => {
            if (operation === 'create') return new Date()
            return value
          },
        ],
      },
    },
    {
      name: 'generateToken',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/src/components/admin/GenerateTokenButton#GenerateTokenButton',
        },
      },
    },
  ],
  timestamps: true,
}
