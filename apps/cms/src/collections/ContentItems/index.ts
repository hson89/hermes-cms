import type { CollectionConfig } from 'payload'

import { copilotEditEndpoint } from './endpoints'
import { tenantDeliveryAccess } from './access'
import { getTenantIds } from '../Users/utils'

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
      ((user as any).role === 'super-admin' ||
        (user as any).role === 'tenant-admin' ||
        (user as any).role === 'editor'),
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
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
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
