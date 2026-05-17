import type { CollectionConfig } from 'payload'

/**
 * Users collection.
 * Extends Payload's built-in auth to include tenant affiliation and role.
 *
 * T011 - Setup base Payload Auth collections (Users)
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    depth: 0,
  },
  admin: {
    useAsTitle: 'email',
    description: 'CMS users managed via multi-tenant architecture.',
    components: {
      views: {
        list: {
          Component: '/src/components/views/UserListPage#UserListPage',
        },
        edit: {
          default: {
            Component: '/src/components/views/CreateUserPage#CreateUserPage',
          },
        },
      },
    },
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        console.log('--- USER DOC READ ---')
        console.log(JSON.stringify(doc))
        return doc
      }
    ]
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Full Name',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      label: 'Role',
      options: [
        { label: 'Super Admin', value: 'super-admin' },
        { label: 'Tenant Admin', value: 'tenant-admin' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
  timestamps: true,
}
