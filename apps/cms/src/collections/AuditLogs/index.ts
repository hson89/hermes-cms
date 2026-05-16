import type { CollectionConfig } from 'payload'

/**
 * AuditLogs collection.
 * Centralized log for security and operational events.
 *
 * T003 - Create AuditLogs collection
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'action',
    description: 'Security and operational event logs.',
    group: 'System',
    defaultColumns: ['action', 'severity', 'tenant', 'user', 'createdAt'],
  },
  access: {
    // Read: Super Admin only
    read: ({ req: { user } }) => {
      if (!user) return false
      return (user as any).role === 'super-admin'
    },
    // Create: System only (internal service or super-admin for testing)
    create: ({ req: { user } }) => {
      if (!user) return false
      return (user as any).role === 'super-admin'
    },
    // Update/Delete: Disabled
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'action',
      type: 'text',
      required: true,
      label: 'Action',
      admin: {
        description: 'E.g., tenant_resolution_failure, impersonation_start',
      },
    },
    {
      name: 'severity',
      type: 'select',
      required: true,
      label: 'Severity',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'info',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      label: 'Tenant',
      admin: {
        description: 'Reference to the tenant this log belongs to.',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'User',
      admin: {
        description: 'The user who performed the action.',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Metadata',
      admin: {
        description: 'Extra context (IP, hostname, etc.).',
      },
    },
    {
      name: 'isImpersonated',
      type: 'checkbox',
      label: 'Is Impersonated',
      defaultValue: false,
      admin: {
        description: 'True if action was performed via impersonation.',
      },
    },
  ],
  timestamps: true,
}
