import type { CollectionConfig } from 'payload'

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
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'super-admin') return true
      return { tenantId: { equals: user.tenantId } }
    },
    create: ({ req: { user } }) =>
      Boolean(user) &&
      (user?.role === 'super-admin' || user?.role === 'tenant-admin'),
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'super-admin') return true
      return { tenantId: { equals: user.tenantId } }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'super-admin') return true
      return { tenantId: { equals: user.tenantId } }
    },
  },
  hooks: {
    afterChange: [
      ({ doc, operation, req }) => {
        if (operation === 'create') {
          // Dynamically import to avoid circular dependencies if any
          import('../../services/deployment_service').then(({ DeploymentService }) => {
            const service = new DeploymentService(req.payload)
            // Trigger asynchronously
            service.triggerDeployment(doc.id).catch(console.error)
          })
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
      name: 'tenantId',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Tenant',
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
  ],
  timestamps: true,
}
