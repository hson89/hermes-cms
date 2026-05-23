import type { CollectionConfig } from 'payload'
import { validateLockHook } from './hooks/validateLock'
import { refreshActivityHook } from './hooks/refreshActivity'
import { capVersionsHook } from './hooks/capVersions'

export const DraftingSessions: CollectionConfig = {
  slug: 'drafting-sessions',
  admin: {
    useAsTitle: 'id',
    group: 'AI Config',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      return {
        user: {
          equals: user.id,
        },
      }
    },
    admin: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      return {
        user: {
          equals: user.id,
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      return {
        user: {
          equals: user.id,
        },
      }
    },
  },
  hooks: {
    beforeChange: [validateLockHook, refreshActivityHook, capVersionsHook],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'contentType',
      type: 'relationship',
      relationTo: 'content-types',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'draftData',
      type: 'json',
      required: true,
      defaultValue: {},
    },
    {
      name: 'mainMedia',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'activeLocale',
      type: 'text',
      required: true,
      defaultValue: 'en',
    },
    {
      name: 'selectedModel',
      type: 'text',
    },
    {
      name: 'lastActivityAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
    {
      name: 'versions',
      type: 'json',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'aiSessionId',
      type: 'text',
      label: 'AI Session ID',
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
