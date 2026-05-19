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
        'content-types': {},
        'content-items': {},
        'api-keys': {},
        'media': { customTenantField: true },
        'audit-logs': { customTenantField: true },
        'hosted-sites': { customTenantField: true },
        'ai-prompt-history': {},
        'drafting-sessions': {},
        'style-modifiers': {},
        'ai-audit-logs': {},
      } as any,
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
