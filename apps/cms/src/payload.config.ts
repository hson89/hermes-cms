import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { APIKeys } from './collections/Users/APIKeys'
import { ContentTypes } from './collections/ContentTypes'
import { ContentItems } from './collections/ContentItems'

import { HostedSites } from './collections/HostedSites'

/**
 * Payload CMS configuration for Hermes AI.
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
        user && (user as { role?: string }).role === 'super-admin',
    }),
  ],

  // TypeScript output for generated types
  typescript: {
    outputFile: './src/payload-types.ts',
  },

  // Admin panel configuration
  admin: {
    meta: {
      titleSuffix: '- Hermes AI',
      description: 'Multi-tenant headless CMS with AI-powered content creation.',
    },
    // The Users collection that logs into the admin panel
    user: 'users',
    routes: {
      login: '/login',
    },
    components: {
      views: {
        login: {
          Component: '/src/components/views/LoginPage#default',
          exact: true,
          path: '/login',
        },
        createFirstUser: {
          Component: '/src/components/views/InitPage#default',
          exact: true,
          path: '/create-first-user',
        },
      },
    },
  },

  // GraphQL endpoint (T027 - content delivery API)
  graphQL: {
    disable: false,
    schemaOutputFile: './src/schema.graphql',
  },
})
