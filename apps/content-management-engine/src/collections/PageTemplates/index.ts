import type { CollectionConfig, CollectionBeforeChangeHook } from 'payload'
import { tenantAccess } from '../access/tenantAccess'

export const beforeChangeHook: CollectionBeforeChangeHook = async ({ data, req, operation, originalDoc }) => {
  if (operation === 'create' && req.user) {
    data.createdBy = req.user.id
  }
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
    defaultColumns: ['name', 'slug', 'contentType', 'status', 'createdBy', 'tenant'],
    components: {
      views: {
        list: {
          Component: '/src/components/views/TemplateLibrary#TemplateLibrary',
        },
        edit: {
          default: {
            Component: '/src/components/views/TemplateWorkspace#TemplateWorkspace',
          },
        },
      },
    },
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
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Brief overview of the template purpose and architecture',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Preview Image',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      label: 'Slug',
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Categorization tags for the template library',
      },
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
      name: 'archetype',
      type: 'select',
      required: true,
      label: 'Layout Archetype',
      options: [
        { label: 'Longform Narrative', value: 'longform' },
        { label: 'Landing Page', value: 'landing' },
        { label: 'Archival Minimal', value: 'minimal' },
      ],
      defaultValue: 'landing',
    },
    {
      name: 'layout',
      type: 'array',
      required: false,
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
        { label: 'Active', value: 'active' },
        { label: 'Draft', value: 'draft' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'draft',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'restrictedAccess',
      type: 'checkbox',
      label: 'Restricted Access',
      defaultValue: false,
      admin: {
        description: 'Limit to Editor-in-Chief & Admin roles',
        position: 'sidebar',
      },
    },
    {
      name: 'locked',
      type: 'checkbox',
      label: 'Lock Template',
      defaultValue: false,
      admin: {
        description: 'Prevent accidental schema mapping changes',
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
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
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
