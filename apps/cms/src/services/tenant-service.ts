import { BasePayload } from 'payload'

export interface TenantResolutionResult {
  id: string
  slug: string
  status: string
  branding?: {
    primaryColor?: string
    logoUrl?: string
  }
}

/**
 * TenantService
 * Handles domain resolution and tenant status validation.
 */
export class TenantService {
  private payload: BasePayload

  constructor(payload: BasePayload) {
    this.payload = payload
  }

  /**
   * Resolves a tenant by hostname or slug.
   * Logic:
   * 1. Search for hostname in tenants.domains array.
   * 2. If not found, fallback to searching by slug.
   */
  async resolveTenantByHostname(hostname: string): Promise<TenantResolutionResult | null> {
    // 1. Search by hostname
    const byHostname = await this.payload.find({
      collection: 'tenants',
      where: {
        'domains.hostname': { equals: hostname },
      },
      limit: 1,
      depth: 1,
    })

    if (byHostname.docs.length > 0) {
      const tenant = byHostname.docs[0] as any
      return {
        id: tenant.id,
        slug: tenant.slug,
        status: tenant.status,
        branding: {
          primaryColor: tenant.branding?.primaryColor,
          logoUrl: tenant.branding?.logo?.url,
        },
      }
    }

    // 2. Fallback: Search by slug (e.g. for client-a.hermes-cms.com where client-a is the slug)
    // We try to match the first part of the hostname as a slug
    const possibleSlug = hostname.split('.')[0]
    const bySlug = await this.payload.find({
      collection: 'tenants',
      where: {
        slug: { equals: possibleSlug },
      },
      limit: 1,
      depth: 1,
    })

    if (bySlug.docs.length > 0) {
      const tenant = bySlug.docs[0] as any
      return {
        id: tenant.id,
        slug: tenant.slug,
        status: tenant.status,
        branding: {
          primaryColor: tenant.branding?.primaryColor,
          logoUrl: tenant.branding?.logo?.url,
        },
      }
    }

    // T025 - Log resolution failure
    await this.payload.create({
      collection: 'audit-logs',
      data: {
        action: 'TENANT_RESOLUTION_FAILURE',
        severity: 'warning',
        metadata: {
          hostname,
          reason: 'No matching domain or slug found',
          source: 'TenantService.resolveTenantByHostname',
        },
      },
      overrideAccess: true,
    })

    return null
  }

  /**
   * Enables a Super Admin to impersonate a tenant.
   * Logs the impersonation event.
   */
  async impersonateTenant(superAdminId: string, tenantId: string): Promise<boolean> {
    const tenant = await this.payload.findByID({
      collection: 'tenants',
      id: tenantId,
    })

    if (!tenant) return false

    await this.payload.create({
      collection: 'audit-logs',
      data: {
        action: 'IMPERSONATION_START',
        severity: 'info',
        tenant: tenantId,
        user: superAdminId, // Payload should accept ID for single relationship
        isImpersonated: true,
        metadata: {
          impersonatedTenant: tenant.slug,
        },
      },
      overrideAccess: true,
    })

    return true
  }

  /**
   * Validates if a tenant is allowed to access the system.
   * Blocks 'suspended' and 'archived' tenants.
   */
  validateTenantStatus(status: string, isSuperAdmin: boolean = false): { allowed: boolean; code?: string } {
    // Super Admins can bypass status checks for management purposes
    if (isSuperAdmin) return { allowed: true }

    if (status === 'active') {
      return { allowed: true }
    }
    if (status === 'suspended') {
      return { allowed: false, code: 'TENANT_SUSPENDED' }
    }
    if (status === 'archived') {
      return { allowed: false, code: 'TENANT_ARCHIVED' }
    }
    return { allowed: false, code: 'TENANT_INACTIVE' }
  }
}
