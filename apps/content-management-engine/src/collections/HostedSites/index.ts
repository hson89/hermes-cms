import type { CollectionConfig } from 'payload'
import { getTenantIds } from '../Users/utils'

/**
 * HostedSites collection.
 * Manages the deployment of front-end starter templates for tenants.
 *
 * T030 - Create HostedSite collection (US3)
 */
export const HostedSites: CollectionConfig = {
  slug: 'hosted-sites',
  admin: {
    useAsTitle: 'name',
    description: 'Managed deployments of front-end templates for your tenant.',
    components: {
      views: {
        list: {
          Component: '/src/components/views/HostedSiteListPage#HostedSiteListPage',
        },
        edit: {
          default: {
            Component: '/src/components/views/CreateHostedSitePage#CreateHostedSitePage',
          },
        },
      },
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      const tenantIds = getTenantIds(user)
      if (tenantIds.length === 0) return false
      return {
        tenant: {
          in: tenantIds,
        },
      }
    },
    create: ({ req: { user } }) =>
      Boolean(user) &&
      ((user as any).role === 'super-admin' || (user as any).role === 'tenant-admin'),
    update: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      const tenantIds = getTenantIds(user)
      if (tenantIds.length === 0) return false
      return {
        tenant: {
          in: tenantIds,
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if ((user as any).role === 'super-admin') return true
      const tenantIds = getTenantIds(user)
      if (tenantIds.length === 0) return false
      return {
        tenant: {
          in: tenantIds,
        },
      }
    },
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          // Dynamically import to avoid circular dependencies if any
          const { DeploymentService } = await import('../../services/deployment_service')
          const service = new DeploymentService(req.payload)
          // Pass the doc and req to participate in the transaction and avoid redundant lookups
          await service.triggerDeployment(doc.id, doc, req)
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Site Name',
    },

    {
      name: 'template',
      type: 'select',
      required: true,
      label: 'Starter Template',
      options: [
        { label: 'Next.js Blog', value: 'nextjs-blog' },
        { label: 'Astro Portfolio', value: 'astro-portfolio' },
      ],
    },
    {
      name: 'domain',
      type: 'text',
      label: 'Custom Domain',
      admin: {
        description: 'Optional custom domain for this site.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      label: 'Deployment Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Deploying', value: 'deploying' },
        { label: 'Active', value: 'active' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'deployedUrl',
      type: 'text',
      label: 'Deployed URL',
      admin: {
        readOnly: true,
      },
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
