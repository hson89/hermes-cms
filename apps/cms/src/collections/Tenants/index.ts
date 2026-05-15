import type { CollectionConfig } from 'payload'

/**
 * Tenants collection.
 * Each tenant represents an isolated organizational unit within the CMS.
 * The `@payloadcms/plugin-multi-tenant` plugin uses this collection to
 * enforce logical data isolation via Payload Access Control.
 *
 * T012 - Setup base Tenant collection
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    description: 'Organizations or workspaces using the CMS.',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Tenant Name',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Slug',
      admin: {
        description: 'Unique URL-safe identifier for the tenant.',
      },
    },
  ],
  timestamps: true,
}
