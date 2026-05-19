import type { CollectionConfig } from 'payload'

export const AIRateLimits: CollectionConfig = {
  slug: 'ai-rate-limits',
  admin: {
    hidden: true,
  },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'userId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
    },
    {
      name: 'requestPath',
      type: 'text',
      required: true,
    },
  ],
  timestamps: false,
}
