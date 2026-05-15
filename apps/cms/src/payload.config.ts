import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { APIKeys } from './collections/Users/APIKeys'
import { ContentTypes } from './collections/ContentTypes'
import { ContentItems } from './collections/ContentItems'
import { HostedSites } from './collections/HostedSites'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      views: {
        dashboard: {
          Component: '/src/components/views/Dashboard#Dashboard',
        },
        CreateFirstUser: {
          Component: '/src/components/views/InitPage#InitPage',
        },
        login: {
          Component: '/src/components/views/LoginPage#LoginPage',
        },
      },
      Nav: '/src/components/admin/Nav#Nav',
    },
  },
  collections: [Tenants, Users, APIKeys, ContentTypes, ContentItems, HostedSites],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || 'YOUR_SECRET_HERE',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || 'postgresql://postgres:postgres@localhost:5432/hermes_cms',
    },
    push: true,
  }),
  plugins: [
    multiTenantPlugin({
      collections: {
        'content-types': {},
        'content-items': {},
        'api-keys': {},
      },
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) => {
        if (!user) return false
        return (user as any).role === 'super-admin'
      },
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
