export interface NavigationItem {
  label: string
  icon?: string
  path: string
  roleRequirement?: 'super-admin' | 'admin' | 'editor'
}

export const MAIN_NAV_LINKS: NavigationItem[] = [
  { label: 'Dashboard', icon: 'grid_view', path: '/admin' },
  { label: 'Marketplace', icon: 'shopping_bag', path: '/admin/collections/marketplace-apps' },
  { label: 'Installed Apps', icon: 'extension', path: '/admin/collections/tenant-apps' },
  { label: 'Tenants', icon: 'domain', path: '/admin/collections/tenants', roleRequirement: 'super-admin' },
  { label: 'Users', icon: 'group', path: '/admin/collections/users', roleRequirement: 'admin' },
  { label: 'Building Blocks', icon: 'widgets', path: '/admin/collections/building-blocks' },
]

export const CONTENT_SUB_LINKS: NavigationItem[] = [
  { label: 'Content List', path: '/admin/collections/content-items' },
  { label: 'Create Content', path: '/admin/draft' },
  { label: 'Content Types', path: '/admin/collections/content-types' },
]

export const TEMPLATE_SUB_LINKS: NavigationItem[] = [
  { label: 'Library', path: '/admin/collections/page-templates' },
  { label: 'Visual Builder', path: '/admin/templates/builder' },
  { label: 'Schema Mapping', path: '/admin/templates/mapping' },
  { label: 'Deployment History', path: '/admin/templates/history' },
]

export const BOTTOM_NAV_LINKS: NavigationItem[] = [
  { label: 'API Keys', icon: 'vpn_key', path: '/admin/collections/api-keys' },
  { label: 'Hosted Sites', icon: 'web', path: '/admin/collections/hosted-sites' },
]
