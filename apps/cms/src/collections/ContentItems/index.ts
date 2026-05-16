import type { CollectionConfig } from 'payload'

import { copilotEditEndpoint } from './endpoints'

import { tenantDeliveryAccess } from './access'

/**
 * ContentItems collection.
 * Stores the actual content entries authored (or AI-drafted) for each tenant.
 * Enforces tenant isolation at the access control layer.
 *
 * T020 - Create ContentItem collection (US2)
 * T027 - Tenant isolation checks on delivery endpoints
 */
export const ContentItems: CollectionConfig = {
  slug: 'content-items',
  endpoints: [copilotEditEndpoint],
  admin: {
    useAsTitle: 'title',
    description: 'Content entries per tenant and content type.',
  },
  access: {
    // Public delivery (GET) is guarded by API key at the endpoint level.
    // Here we enforce tenant isolation for authenticated CMS users.
    read: tenantDeliveryAccess,
    create: ({ req: { user } }) =>
      Boolean(user) &&
      (user?.role === 'super-admin' ||
        user?.role === 'tenant-admin' ||
        user?.role === 'editor'),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'super-admin') return true
      return {
        tenantId: {
          equals: user.tenantId,
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'super-admin') return true
      return {
        tenantId: {
          equals: user.tenantId,
        },
      }
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
    },
    {
      name: 'tenantId',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Tenant',
      admin: {
        description: 'The tenant that owns this content item.',
      },
    },
    {
      name: 'contentType',
      type: 'relationship',
      relationTo: 'content-types',
      required: true,
      label: 'Content Type',
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Content',
      admin: {
        description:
          'Rich text / block-based content. Supports lexical editor blocks.',
      },
    },
    /*
    {
      name: 'copilotUI',
      type: 'ui',
      admin: {
        components: {
          Field: './src/components/Editor#CustomEditorWithCopilot',
        },
      },
    },
    */
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
  timestamps: true,
}
