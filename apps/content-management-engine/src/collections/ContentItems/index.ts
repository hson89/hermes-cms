import type { CollectionConfig, CollectionBeforeValidateHook } from 'payload'

import { copilotEditEndpoint } from './endpoints'
import { tenantDeliveryAccess } from './access'
import { getTenantIds } from '../Users/utils'
import { validateContentItem } from './validation'

/**
 * Hook to dynamically validate field data against its ContentType schema before saving.
 */
const beforeValidateHook: CollectionBeforeValidateHook = async ({
  data,
  req,
  originalDoc,
}) => {
  const { payload } = req

  const contentTypeId = data?.contentType || originalDoc?.contentType
  const fieldsData = data?.fieldsData || originalDoc?.fieldsData || {}
  const tenantId = data?.tenant || originalDoc?.tenant

  if (!contentTypeId || !tenantId) {
    return data
  }

  // 1. Fetch the ContentType schema
  const contentType = await payload.findByID({
    collection: 'content-types' as any,
    id: contentTypeId,
    overrideAccess: true,
  })

  if (!contentType || !contentType.schema) {
    return data
  }

  // 2. Perform dynamic validation
  const errors = await validateContentItem(
    fieldsData,
    contentType.schema,
    tenantId,
    payload,
    originalDoc?.id
  )

  // 3. If errors exist, throw a validation error
  if (errors.length > 0) {
    const errorDetails = errors.map((e) => `${e.field}: ${e.message}`).join('; ')
    throw new Error(`Validation Error: ${errorDetails}`)
  }

  return data
}

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
  labels: {
    singular: 'Content Item',
    plural: 'Content Items',
  },
  endpoints: [copilotEditEndpoint],
  admin: {
    useAsTitle: 'title',
    description: 'Content entries per tenant and content type.',
    components: {
      views: {
        list: {
          Component: '/src/components/views/ContentItemListPage#ContentItemListPage',
        },
      },
      edit: {
        beforeDocumentControls: [
          '/src/components/admin/DraftingCTA#DraftingCTA',
        ],
      },
    },
  },
  access: {
    // Public delivery (GET) is guarded by API key at the endpoint level.
    // Here we enforce tenant isolation for authenticated CMS users.
    read: ({ req: { user } }) => Boolean(user),
    admin: ({ req: { user } }) => Boolean(user),
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
  hooks: {
    beforeValidate: [beforeValidateHook],
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
      name: 'fieldsData',
      type: 'json',
      required: true,
      label: 'Fields Data',
      defaultValue: {},
      admin: {
        description: 'Structured JSON data holding actual field values matching the selected Content Type schema.',
      },
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
