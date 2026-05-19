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
    group: 'Identity',
    defaultColumns: ['name', 'slug', 'status', 'tier', 'updatedAt'],
    components: {
      views: {
        list: {
          Component: '/src/components/views/TenantListPage#TenantListPage',
        },
        edit: {
          default: {
            Component: '/src/components/views/CreateTenantPage#CreateTenantPage',
          },
        },
      },
    },
  },
  access: {
    // Read: Super Admins can read all. 
    // Tenant users can only read their own tenant (enforced by multi-tenant plugin).
    // For now, keeping it simple as Super Admin control.
    read: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      // multi-tenant plugin will add further restrictions
      return true
    },
    // Mutation: Super Admin only
    create: ({ req: { user } }) => (user as any)?.role === 'super-admin',
    update: ({ req: { user } }) => (user as any)?.role === 'super-admin',
    delete: ({ req: { user } }) => (user as any)?.role === 'super-admin',
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
      validate: (val: string | string[] | null | undefined) => {
        if (!val || typeof val !== 'string') return 'Slug is required'
        if (!/^[a-z0-9-]+$/.test(val)) {
          return 'Slug must be lowercase alphanumeric with hyphens'
        }
        return true
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tier',
      type: 'select',
      required: true,
      label: 'Service Tier',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Premium', value: 'premium' },
        { label: 'Enterprise', value: 'enterprise' },
      ],
      defaultValue: 'standard',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'defaultLocale',
      type: 'select',
      required: true,
      label: 'Default Locale',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
        { label: 'German', value: 'de' },
      ],
      defaultValue: 'en',
    },
    {
      name: 'defaultLLMModel',
      type: 'select',
      label: 'Default LLM Model',
      options: [
        { label: 'OpenAI GPT-4o', value: 'openai/gpt-4o' },
        { label: 'Anthropic Claude 3.5 Sonnet', value: 'anthropic/claude-3-5-sonnet' },
        { label: 'Google Gemini 2.5 Flash', value: 'google/gemini-2.5-flash' },
      ],
      defaultValue: 'openai/gpt-4o',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'defaultImageModel',
      type: 'select',
      label: 'Default Image Model',
      options: [
        { label: 'OpenAI DALL-E 3', value: 'openai/dall-e-3' },
      ],
      defaultValue: 'openai/dall-e-3',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'domains',
      type: 'array',
      label: 'Mapped Domains',
      required: true,
      validate: (val: any, { data }: any) => {
        const tier = data?.tier || 'standard'
        const count = val?.length || 0
        
        if (tier === 'standard' && count > 10) {
          return 'Standard tier is limited to 10 domains'
        }
        if (tier === 'premium' && count > 50) {
          return 'Premium tier is limited to 50 domains'
        }
        return true
      },
      fields: [
        {
          name: 'hostname',
          type: 'text',
          required: true,
          unique: true, // This might only be unique within the array in some DBs, but Payload handles global uniqueness if specified.
          validate: (val: string | string[] | null | undefined) => {
            if (!val || typeof val !== 'string') return 'Hostname is required'
            // Basic hostname regex
            if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(val)) {
              return 'Invalid hostname format'
            }
            return true
          },
        },
        {
          name: 'isPrimary',
          type: 'checkbox',
          defaultValue: false,
          label: 'Primary Domain',
        },
      ],
      admin: {
        description: 'Hostnames mapped to this tenant for branded access.',
      },
    },
    {
      name: 'branding',
      type: 'group',
      label: 'Branding',
      fields: [
        {
          name: 'logo',
          type: 'relationship',
          relationTo: 'media',
          label: 'Workspace Logo',
        },
        {
          name: 'primaryColor',
          type: 'text',
          label: 'Primary Color (Hex)',
          validate: (val: string | string[] | null | undefined) => {
            if (!val) return true // Optional
            if (typeof val !== 'string' || !/^#[0-9A-F]{6}$/i.test(val)) {
              return 'Invalid hex color format'
            }
            return true
          },
        },
      ],
    },
  ],
  timestamps: true,
}
