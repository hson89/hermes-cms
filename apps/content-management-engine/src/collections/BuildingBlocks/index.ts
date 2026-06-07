import type { CollectionConfig } from 'payload'
import { tenantAccess, tenantReadAccess } from '../access/tenantAccess'

export const BuildingBlocks: CollectionConfig = {
  slug: 'building-blocks',
  admin: {
    useAsTitle: 'name',
    group: 'Templates',
    defaultColumns: ['name', 'slug', 'status', 'tenant'],
    components: {
      views: {
        list: {
          Component: '/src/components/views/BuildingBlockLibrary#BuildingBlockLibrary',
        },
        edit: {
          default: {
            Component: '/src/components/views/BuildingBlockWorkspace#BuildingBlockWorkspace',
          },
        },
      },
    },
  },
  access: {
    read: tenantReadAccess,
    create: tenantAccess,
    update: tenantAccess,
    delete: tenantAccess,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      label: 'Slug',
      admin: {
        description: 'Unique identifier for the block (e.g. hero-section)',
      },
    },
    {
      name: 'schema',
      type: 'json',
      required: true,
      label: 'Block Schema',
      admin: {
        description: 'JSON definition of block properties and types',
      },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      label: 'Thumbnail',
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Layout', value: 'layout' },
        { label: 'Media', value: 'media' },
        { label: 'Text', value: 'text' },
        { label: 'Interactive', value: 'interactive' },
      ],
      defaultValue: 'layout',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Deprecated', value: 'deprecated' },
      ],
      defaultValue: 'active',
      required: true,
      admin: {
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
