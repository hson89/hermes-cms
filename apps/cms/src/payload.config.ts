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
import { AuditLogs } from './collections/AuditLogs'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, '..'),
    },
    components: {
      views: {
        dashboard: {
          Component: '/src/components/views/Dashboard#Dashboard',
        },
        init: {
          Component: '/src/components/views/InitPage#InitPage',
        },
        login: {
          Component: '/src/components/views/LoginPage#LoginPage',
        },
      },
      Nav: '/src/components/admin/Nav#Nav',
      header: ['/src/components/admin/Header#Header'] as any,
    },
  },
  collections: [Tenants, Users, ContentTypes, ContentItems, HostedSites, Media, AuditLogs, APIKeys],
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
        'media': { customTenantField: true },
        'audit-logs': { customTenantField: true },
        'hosted-sites': {},
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
