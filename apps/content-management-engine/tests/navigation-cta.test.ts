import { describe, it, expect } from '@jest/globals'
import { getSidebarCta, DEFAULT_CTA } from '../src/utils/navigation'

describe('getSidebarCta', () => {
  it('should return default CTA when pathname is falsy', () => {
    expect(getSidebarCta(null)).toEqual(DEFAULT_CTA)
    expect(getSidebarCta(undefined)).toEqual(DEFAULT_CTA)
    expect(getSidebarCta('')).toEqual(DEFAULT_CTA)
  })

  it('should return default CTA for non-collection paths', () => {
    expect(getSidebarCta('/admin')).toEqual(DEFAULT_CTA)
    expect(getSidebarCta('/admin/support')).toEqual(DEFAULT_CTA)
  })

  it('should return mapped CTAs for recognized collection slugs', () => {
    expect(getSidebarCta('/admin/collections/tenants')).toEqual({
      label: 'Create Tenant',
      path: '/admin/collections/tenants/create',
      icon: 'domain_add'
    })
    
    expect(getSidebarCta('/admin/collections/users')).toEqual({
      label: 'Create User',
      path: '/admin/collections/users/create',
      icon: 'person_add'
    })

    expect(getSidebarCta('/admin/collections/api-keys')).toEqual({
      label: 'Create API Key',
      path: '/admin/collections/api-keys/create',
      icon: 'key'
    })

    expect(getSidebarCta('/admin/collections/content-items')).toEqual({
      label: 'Create Content',
      path: '/admin/collections/content-items/create',
      icon: 'post_add'
    })
  })

  it('should handle collection subroutes and query parameters', () => {
    expect(getSidebarCta('/admin/collections/tenants?limit=10&depth=1')).toEqual({
      label: 'Create Tenant',
      path: '/admin/collections/tenants/create',
      icon: 'domain_add'
    })

    expect(getSidebarCta('/admin/collections/tenants/64a9fb23d1d643ef9cb14c41')).toEqual({
      label: 'Create Tenant',
      path: '/admin/collections/tenants/create',
      icon: 'domain_add'
    })
  })

  it('should dynamically singularize and capitalize unmapped collections', () => {
    expect(getSidebarCta('/admin/collections/custom-entities')).toEqual({
      label: 'Create Custom Entity',
      path: '/admin/collections/custom-entities/create',
      icon: 'add_circle'
    })

    expect(getSidebarCta('/admin/collections/workflows')).toEqual({
      label: 'Create Workflow',
      path: '/admin/collections/workflows/create',
      icon: 'add_circle'
    })
  })
})
