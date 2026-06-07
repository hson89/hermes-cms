import { getTenantIds } from '../Users/utils'
import type { CollectionConfig, Access, Where } from 'payload'
import type { User } from '../../payload-types'

export const mediaAccess: {
  read: Access
  create: Access
  update: Access
  delete: Access
} = {
  read: ({ req: { user } }) => {
    if (!user) {
      return {
        tenant: {
          equals: null,
        },
      } as unknown as Where
    }
    const typedUser = user as User
    if (typedUser.role === 'super-admin') return true

    const tenantIds = getTenantIds(user)
    if (tenantIds.length === 0) {
      return {
        tenant: {
          equals: null,
        },
      } as unknown as Where
    }

    return {
      or: [
        {
          tenant: {
            in: tenantIds,
          },
        },
        {
          tenant: {
            equals: null,
          },
        },
      ],
    } as unknown as Where
  },
  create: ({ req: { user } }) => {
    if (!user) return false
    const typedUser = user as User
    if (typedUser.role === 'super-admin') return true

    const tenantIds = getTenantIds(user)
    if (tenantIds.length === 0) return false

    return {
      tenant: {
        in: tenantIds,
      },
    } as unknown as Where
  },
  update: ({ req: { user } }) => {
    if (!user) return false
    const typedUser = user as User
    if (typedUser.role === 'super-admin') return true

    const tenantIds = getTenantIds(user)
    if (tenantIds.length === 0) return false

    return {
      tenant: {
        in: tenantIds,
      },
    } as unknown as Where
  },
  delete: ({ req: { user } }) => {
    if (!user) return false
    const typedUser = user as User
    if (typedUser.role === 'super-admin') return true

    const tenantIds = getTenantIds(user)
    if (tenantIds.length === 0) return false

    return {
      tenant: {
        in: tenantIds,
      },
    } as unknown as Where
  },
}

export const Media: CollectionConfig = {
  slug: 'media',
  upload: true,
  admin: {
    group: 'Content',
  },
  access: {
    read: mediaAccess.read,
    admin: ({ req: { user } }) => !!user,
    create: mediaAccess.create,
    update: mediaAccess.update,
    delete: mediaAccess.delete,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      admin: {
        description: 'Reference to the tenant this media belongs to.',
        position: 'sidebar',
      },
    },
  ],
}

