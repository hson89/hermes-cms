export interface CtaConfig {
  label: string
  path: string
  icon: string
}

export const COLLECTION_CTA_MAP: Record<string, CtaConfig> = {
  'tenants': { label: 'Create Tenant', path: '/admin/collections/tenants/create', icon: 'domain_add' },
  'users': { label: 'Create User', path: '/admin/collections/users/create', icon: 'person_add' },
  'content-types': { label: 'Create Content Type', path: '/admin/collections/content-types/create', icon: 'playlist_add' },
  'building-blocks': { label: 'Create Building Block', path: '/admin/collections/building-blocks/create', icon: 'widgets' },
  'page-templates': { label: 'Create Page Template', path: '/admin/collections/page-templates/create', icon: 'library_add' },
  'api-keys': { label: 'Create API Key', path: '/admin/collections/api-keys/create', icon: 'key' },
  'hosted-sites': { label: 'Create Hosted Site', path: '/admin/collections/hosted-sites/create', icon: 'add_to_queue' },
  'marketplace-apps': { label: 'Create App', path: '/admin/collections/marketplace-apps/create', icon: 'add_shopping_cart' },
  'tenant-apps': { label: 'Install App', path: '/admin/collections/tenant-apps/create', icon: 'extension' },
  'content-items': { label: 'Create Content', path: '/admin/collections/content-items/create', icon: 'post_add' },
  'media': { label: 'Upload Media', path: '/admin/collections/media/create', icon: 'add_photo_alternate' },
}

export const DEFAULT_CTA: CtaConfig = {
  label: 'Create Content',
  path: '/admin/collections/content-items/create',
  icon: 'post_add',
}

export const getSidebarCta = (pathname: string | null | undefined): CtaConfig => {
  if (!pathname) return DEFAULT_CTA

  // Extract collection slug from standard Payload paths e.g. /admin/collections/tenants or /admin/collections/tenants/create
  const match = pathname.match(/^\/admin\/collections\/([^/?#]+)/)
  if (!match) return DEFAULT_CTA

  const slug = match[1]

  // Direct mapping check
  if (COLLECTION_CTA_MAP[slug]) {
    return COLLECTION_CTA_MAP[slug]
  }

  // Smart fallback dynamic singularization & capitalization for unmapped collections
  const cleanLabel = slug
    .split('-')
    .map(word => {
      let w = word
      // Singularize word: handles standard -s and -ies suffixes
      if (w.toLowerCase() !== 'media') {
        if (w.endsWith('ies') && w.length > 3) {
          w = w.slice(0, -3) + 'y'
        } else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
          w = w.slice(0, -1)
        }
      }
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')

  return {
    label: `Create ${cleanLabel}`,
    path: `/admin/collections/${slug}/create`,
    icon: 'add_circle',
  }
}
