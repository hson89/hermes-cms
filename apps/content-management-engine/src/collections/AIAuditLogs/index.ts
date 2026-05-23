import type { CollectionConfig } from 'payload'

export const AIAuditLogs: CollectionConfig = {
  slug: 'ai-audit-logs',
  admin: {
    group: 'AI Config',
  },
  access: {
    read: ({ req: { user } }) => {
      if ((user as any)?.role === 'tenant-admin' || (user as any)?.role === 'super-admin') return true
      return false
    },
    create: () => false, // Only internal
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'drafting-sessions',
    },
    {
      name: 'styleModifier',
      type: 'relationship',
      relationTo: 'style-modifiers',
    },
    {
      name: 'requestType',
      type: 'select',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Refine', value: 'refine' },
        { label: 'Image Generate', value: 'image-generate' },
        { label: 'Schema Create', value: 'schema-create' },
      ],
    },
    {
      name: 'prompt',
      type: 'textarea',
    },
    {
      name: 'model',
      type: 'text',
      required: true,
    },
    {
      name: 'provider',
      type: 'text',
      required: true,
    },
    {
      name: 'promptTokens',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'completionTokens',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'totalTokens',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'estimatedCost',
      type: 'number',
      defaultValue: 0,
      label: 'Estimated Cost (USD microdollars)',
    },
    {
      name: 'durationMs',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
        { label: 'Timeout', value: 'timeout' },
      ],
    },
    {
      name: 'errorMessage',
      type: 'text',
    },
  ],
  timestamps: true,
}
