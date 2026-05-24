import type { CollectionConfig } from 'payload'

/**
 * MarketplaceApps collection.
 * Global directory of available 3rd-party integrations.
 * Only super-admins can create or modify these.
 */
export const MarketplaceApps: CollectionConfig = {
  slug: 'marketplace-apps',
  admin: {
    useAsTitle: 'name',
    description: 'Global directory of available 3rd-party integrations.',
    group: 'Marketplace',
    defaultColumns: ['name', 'slug', 'baseUrl', 'updatedAt'],
    components: {
      views: {
        list: {
          Component: '/src/components/views/MarketplaceAppListPage#MarketplaceAppListPage',
        },
        edit: {
          default: {
            Component: '/src/components/views/MarketplaceAppEditPage#MarketplaceAppEditPage',
          },
        },
      },
    },
  },
  access: {
    // Anyone authenticated can read available apps
    read: ({ req: { user } }) => Boolean(user),
    // Only super-admins can manage the global directory
    create: ({ req: { user } }) => (user as any)?.role === 'super-admin',
    update: ({ req: { user } }) => (user as any)?.role === 'super-admin',
    delete: ({ req: { user } }) => (user as any)?.role === 'super-admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'App Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        description: 'Unique identifier for the app.',
      },
    },
    {
      name: 'baseUrl',
      type: 'text',
      required: true,
      label: 'Base URL',
      admin: {
        description: 'The root endpoint of the 3rd-party application service.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      label: 'App Icon',
    },
  ],
  timestamps: true,
}
