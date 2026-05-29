import type { CollectionConfig } from 'payload'
import { tenantAccess } from '../access/tenantAccess'

export const TemplateDeployments: CollectionConfig = {
  slug: 'template-deployments',
  admin: {
    useAsTitle: 'id',
    group: 'Templates',
    defaultColumns: ['template', 'site', 'status', 'createdAt', 'tenant'],
  },
  access: {
    read: tenantAccess,
    create: tenantAccess,
    update: tenantAccess,
    delete: tenantAccess,
  },
  fields: [
    {
      name: 'template',
      type: 'relationship',
      relationTo: 'page-templates',
      required: true,
    },
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'hosted-sites',
      required: true,
    },
    {
      name: 'triggeredBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Success', value: 'success' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'pending',
      required: true,
    },
    {
      name: 'payload',
      type: 'json',
      required: true,
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
