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
import { AIPromptHistory } from './collections/AIPromptHistory'
import { DraftingSessions } from './collections/DraftingSessions'
import { StyleModifiers } from './collections/StyleModifiers'
import { AIAuditLogs } from './collections/AIAuditLogs'
import { AIRateLimits } from './collections/AIRateLimits'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const configPromise = buildConfig({
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
        createFirstUser: {
          Component: '/src/components/views/InitPage#InitPage',
        },
        login: {
          Component: '/src/components/views/LoginPage#LoginPage',
        },
        drafting: {
          Component: '/src/components/views/DraftingWorkspace#DraftingWorkspace',
          path: '/draft/:contentTypeId?',
        },
      },
      Nav: ['/src/components/ui/organisms/Nav#Nav'] as any,
      header: ['/src/components/ui/organisms/Header#Header'] as any,
    },
  },
  collections: [
    Tenants,
    Users,
    ContentTypes,
    ContentItems,
    HostedSites,
    Media,
    AuditLogs,
    APIKeys,
    AIPromptHistory,
    DraftingSessions,
    StyleModifiers,
    AIAuditLogs,
    AIRateLimits,
  ],
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
        'content-items': { customTenantField: true },
        'api-keys': { customTenantField: true },
        'media': { customTenantField: true },
        'audit-logs': { customTenantField: true },
        'hosted-sites': { customTenantField: true },
        'ai-prompt-history': {},
        'drafting-sessions': { customTenantField: true },
        'style-modifiers': {},
        'ai-audit-logs': {},
      } as any,
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) => {
        if (!user) return false
        if ((user as any).role === 'super-admin') return true
        if ((user as any).collection === 'api-keys' && (user as any).globalAccess) return true
        return false
      },
    }),
  ],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
    autoGenerate: false,
  },
})

// Fix for multi-tenant plugin not saving tenants to JWT by default
// This is required for getTenantIds() to work in access control checks on the server
configPromise.then((config) => {
  if (config.collections) {
    const usersCollection = config.collections.find((c) => c.slug === 'users')
    if (usersCollection && usersCollection.fields) {
      const roleField = usersCollection.fields.find(
        (f) => 'name' in f && f.name === 'role',
      )
      if (roleField) {
        ;(roleField as any).saveToJWT = true
      }

      const tenantsField = usersCollection.fields.find(
        (f) => 'name' in f && f.name === 'tenants',
      )
      if (tenantsField && typeof tenantsField === 'object') {
        ;(tenantsField as any).saveToJWT = true
        // Also ensure the nested relationship field is in the JWT
        if ('fields' in tenantsField && Array.isArray(tenantsField.fields)) {
          const tenantRelField = tenantsField.fields.find(
            (f) => 'name' in f && f.name === 'tenant',
          )
          if (tenantRelField) {
            ;(tenantRelField as any).saveToJWT = true
          }
        }
      }
    }
  }
})

export default configPromise
