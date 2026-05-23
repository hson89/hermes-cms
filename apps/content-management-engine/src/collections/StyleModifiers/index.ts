import type { CollectionConfig } from 'payload'

export const StyleModifiers: CollectionConfig = {
  slug: 'style-modifiers',
  admin: {
    useAsTitle: 'name',
    group: 'AI Config',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      return true // Tenant isolation handled by multi-tenant plugin
    },
    create: ({ req: { user } }) => {
      if ((user as any)?.role === 'tenant-admin' || (user as any)?.role === 'super-admin') return true
      return false
    },
    update: ({ req: { user } }) => {
      if ((user as any)?.role === 'tenant-admin' || (user as any)?.role === 'super-admin') return true
      return false
    },
    delete: ({ req: { user } }) => {
      if ((user as any)?.role === 'tenant-admin' || (user as any)?.role === 'super-admin') return true
      return false
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'systemPrompt',
      type: 'textarea',
      required: true,
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}
