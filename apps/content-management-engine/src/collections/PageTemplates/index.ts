import type { CollectionConfig, CollectionBeforeChangeHook } from 'payload'
import { tenantAccess } from '../access/tenantAccess'

const beforeChangeHook: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  // If we are updating an existing doc, check for version conflicts
  if (originalDoc && data.version !== undefined && originalDoc.version !== undefined) {
    if (data.version !== originalDoc.version) {
      throw new Error('CONFLICT: Template has been modified by another user. Please refresh.')
    }
  }
  // Auto-increment version
  data.version = (originalDoc?.version || 0) + 1
  return data
}

export const PageTemplates: CollectionConfig = {
  slug: 'page-templates',
  admin: {
    useAsTitle: 'name',
    group: 'Templates',
    defaultColumns: ['name', 'slug', 'contentType', 'status', 'tenant'],
  },
  access: {
    read: tenantAccess,
    create: tenantAccess,
    update: tenantAccess,
    delete: tenantAccess,
  },
  hooks: {
    beforeChange: [beforeChangeHook],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Template Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      label: 'Slug',
    },
    {
      name: 'contentType',
      type: 'relationship',
      relationTo: 'content-types',
      required: true,
      label: 'Associated Content Type',
      admin: {
        description: 'The Content Type this template visualizes (1-to-1)',
      },
    },
    {
      name: 'layout',
      type: 'array',
      required: true,
      label: 'Layout Blocks',
      fields: [
        {
          name: 'block',
          type: 'relationship',
          relationTo: 'building-blocks',
          required: true,
        },
        {
          name: 'mappings',
          type: 'json',
          label: 'Field Mappings',
          admin: {
            description: 'Map block properties to Content Type fields',
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      admin: {
        hidden: true,
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
