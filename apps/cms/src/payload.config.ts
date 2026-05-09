import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { Tenants } from './collections/Tenants/index.js'
import { Users } from './collections/Users/index.js'
import { APIKeys } from './collections/Users/APIKeys.js'
import { ContentTypes } from './collections/ContentTypes/index.js'
import { ContentItems } from './collections/ContentItems/index.js'

import { HostedSites } from './collections/HostedSites/index.js'

/**
 * Payload CMS configuration for Hermes CMS.
 *
 * T007 - Setup PostgreSQL database schema and migrations for Payload CMS
 * T009 - Implement multi-tenancy using @payloadcms/plugin-multi-tenant
 * T028 - Add APIKey authentication middleware for delivery endpoints
 */
export default buildConfig({
  secret: process.env.PAYLOAD_SECRET ?? 'change-me-in-production',

  // T007: PostgreSQL adapter – migrations run automatically at startup in dev.
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? 'postgresql://postgres:postgres@localhost:5432/hermes_cms',
    },
    // Payload will auto-generate and apply migrations; in production you should
    // review generated migration files in the ./migrations/ directory first.
    migrationDir: './migrations',
  }),

  // Rich text editor for ContentItems.content
  editor: lexicalEditor({}),

  // All application collections
  collections: [Tenants, Users, APIKeys, ContentTypes, ContentItems, HostedSites],

  // T009: Multi-tenant plugin
  // Automatically scopes reads/writes to the user's active tenant.
  plugins: [
    multiTenantPlugin({
      // Collections managed under multi-tenancy
      collections: {
        'content-types': {},
        'content-items': {},
        'api-keys': {},
      },
      // The slug of the tenants collection
      tenantsSlug: 'tenants',
      // Super-admins bypass tenant isolation
      userHasAccessToAllTenants: (user) =>
        (user as { role?: string }).role === 'super-admin',
    }),
  ],

  // TypeScript output for generated types
  typescript: {
    outputFile: './src/payload-types.ts',
  },

  // Admin panel configuration
  admin: {
    meta: {
      titleSuffix: '- Hermes CMS',
      description: 'Multi-tenant headless CMS with AI-powered content creation.',
    },
    // The Users collection that logs into the admin panel
    user: 'users',
  },

  // GraphQL endpoint (T027 - content delivery API)
  graphQL: {
    disable: false,
    schemaOutputFile: './src/schema.graphql',
  },
})
