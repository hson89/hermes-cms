"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { FilterChips, FilterOption } from '@/components/ui/molecules/FilterChips'
import { RegistryTable, TableColumn } from '@/components/ui/organisms/RegistryTable'
import { RegistryPagination } from '@/components/ui/molecules/RegistryPagination'
import { ConfirmationModal } from '@/components/ui/organisms/ConfirmationModal'
import { Badge } from '@/components/ui/atoms/Badge'

interface TenantDomain {
  hostname: string
  isPrimary: boolean
  id?: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'archived'
  tier: 'standard' | 'premium' | 'enterprise'
  defaultLocale: string
  domains?: TenantDomain[]
  createdAt: string
  updatedAt: string
}

export const TenantListPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()

  // API List States
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'archived'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search inputs to avoid heavy live refetching
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search change
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // Reset page when changing filters
  const handleStatusFilterChange = (status: 'all' | 'active' | 'suspended' | 'archived') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Live Fetch registry
  const fetchTenants = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/tenants?limit=${limit}&page=${page}&sort=-createdAt`

      // Build standard Payload REST API filters
      const filterParts: string[] = []

      if (statusFilter !== 'all') {
        filterParts.push(`where[status][equals]=${statusFilter}`)
      }

      if (debouncedSearch.trim()) {
        // Search by name or slug
        filterParts.push(`where[name][like]=${encodeURIComponent(debouncedSearch.trim())}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve workspace registry.')
      
      const data = await res.json()
      setTenants(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading tenants.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [page, debouncedSearch, statusFilter])

  // Action Menu Helpers
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(activeMenuId === id ? null : id)
  }

  // Close menus on click outside
  useEffect(() => {
    const closeAll = () => setActiveMenuId(null)
    window.addEventListener('click', closeAll)
    return () => window.removeEventListener('click', closeAll)
  }, [])

  // Clipboard Copier
  const handleCopyHostname = (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation()
    const primaryDomain = tenant.domains?.find(d => d.isPrimary) || tenant.domains?.[0]
    if (primaryDomain) {
      navigator.clipboard.writeText(primaryDomain.hostname)
      setSuccess(`Hostname "${primaryDomain.hostname}" copied to clipboard!`)
      setTimeout(() => setSuccess(''), 2500)
    } else {
      setError('No domains are mapped to this tenant.')
      setTimeout(() => setError(''), 2500)
    }
    setActiveMenuId(null)
  }

  // Deletion logic
  const triggerDelete = (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation()
    setTenantToDelete(tenant)
    setActiveMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/tenants/${tenantToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to delete the tenant.')
      }

      setSuccess(`Workspace "${tenantToDelete.name}" was successfully decommissioned.`)
      setTenantToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      // Reload listing
      if (tenants.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        fetchTenants()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to decommission tenant workspace.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Styling maps based on Alexandria theme & Public Sans metrics
  const tierBadges: Record<Tenant['tier'], { text: string; icon: string; color: 'neutral' | 'primary' | 'gold' }> = {
    standard: {
      text: 'Standard',
      icon: 'verified',
      color: 'neutral'
    },
    premium: {
      text: 'Premium',
      icon: 'stars',
      color: 'primary'
    },
    enterprise: {
      text: 'Enterprise',
      icon: 'corporate_fare',
      color: 'gold'
    }
  }

  const statusBadges: Record<Tenant['status'], { text: string; color: 'success' | 'danger' | 'neutral' }> = {
    active: {
      text: 'Active',
      color: 'success'
    },
    suspended: {
      text: 'Suspended',
      color: 'danger'
    },
    archived: {
      text: 'Archived',
      color: 'neutral'
    }
  }

  const filterOptions: FilterOption<'all' | 'active' | 'suspended' | 'archived'>[] = [
    { value: 'all', label: 'All Workspaces' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'archived', label: 'Archived' },
  ]

  const columns: TableColumn<Tenant>[] = [
    {
      key: 'name',
      label: 'Tenant Workspace',
      span: 4,
      renderCell: (tenant) => {
        const firstLetter = tenant.name ? tenant.name.charAt(0).toUpperCase() : 'W'
        return (
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              {firstLetter}
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {tenant.name}
              </span>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-outline mt-1 font-body">
                <span className="font-mono text-[10px]">{tenant.slug}</span>
                <span className="opacity-30">•</span>
                <span className="uppercase text-[10px] font-label font-bold tracking-wider">{tenant.defaultLocale}</span>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'domains',
      label: 'Primary Access Domain',
      span: 3,
      renderCell: (tenant) => {
        const primaryDomain = tenant.domains?.find(d => d.isPrimary) || tenant.domains?.[0]
        const otherDomainsCount = tenant.domains ? tenant.domains.length - 1 : 0
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Access Hostname</span>
            {primaryDomain ? (
              <div className="flex items-center gap-1.5 max-w-full">
                <button
                  type="button"
                  onClick={(e) => handleCopyHostname(tenant, e)}
                  title="Copy hostname to clipboard"
                  className="font-mono text-xs text-on-surface hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0 text-left truncate max-w-[200px]"
                >
                  {primaryDomain.hostname}
                </button>
                {primaryDomain.isPrimary && (
                  <span 
                    title="Primary Hostname"
                    className="inline-flex size-4 rounded-full bg-tertiary/10 text-tertiary dark:text-tertiary-fixed-dim items-center justify-center text-[10px] flex-shrink-0"
                  >
                    <Icon name="check" size={10} weight={700} />
                  </span>
                )}
                {otherDomainsCount > 0 && (
                  <span className="font-label text-[9px] font-bold text-outline uppercase tracking-wider bg-surface-container px-1.5 py-0.5 rounded flex-shrink-0">
                    +{otherDomainsCount}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-outline text-xs italic font-body">No domains mapped</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'tier',
      label: 'Service SLA',
      span: 2,
      renderCell: (tenant) => {
        const tierConf = tierBadges[tenant.tier] || tierBadges.standard
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Service Tier</span>
            <Badge color={tierConf.color} icon={tierConf.icon} size="md">
              {tierConf.text}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Registry Status',
      span: 2,
      renderCell: (tenant) => {
        const statusConf = statusBadges[tenant.status] || statusBadges.active
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Active Status</span>
            <Badge color={statusConf.color} size="md">
              {statusConf.text}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 1,
      headerClassName: 'text-right pr-2',
      renderCell: (tenant) => {
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(tenant.id, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {/* Premium Contextual Action Dropdown (Glassmorphism layout) */}
            {activeMenuId === tenant.id && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl shadow-xl w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/tenants/${tenant.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="edit" size={14} />
                  Edit Settings
                </button>
                
                <button
                  type="button"
                  onClick={(e) => handleCopyHostname(tenant, e)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="content_copy" size={14} />
                  Copy Hostname
                </button>

                <div className="h-[1px] bg-outline-variant/10 my-1" />

                <button
                  type="button"
                  onClick={(e) => triggerDelete(tenant, e)}
                  className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-red-600 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="delete" size={14} className="text-red-500" />
                  Delete Workspace
                </button>
              </div>
            )}
          </div>
        )
      }
    }
  ]

  const emptyState = (
    <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/20 flex flex-col items-center justify-center">
      <div className="size-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 text-outline-variant">
        <Icon name="corporate_fare" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Tenants Registered</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || statusFilter !== 'all' 
          ? 'No workspaces fit the active filters or search parameters. Refine your query.' 
          : 'Start scaling your headless CMS architecture by initializing your very first tenant workspace.'}
      </p>
      {(debouncedSearch || statusFilter !== 'all') && (
        <button
          type="button"
          onClick={() => { setSearch(''); setStatusFilter('all') }}
          className="mt-4 border border-outline-variant/30 text-primary hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  const decommissionContent = tenantToDelete ? (
    <div className="space-y-2">
      <p>
        Are you absolutely sure you want to delete <span className="font-bold text-on-surface">{tenantToDelete.name}</span> (slug: <span className="font-mono bg-surface-container px-1 py-0.5 rounded text-on-surface">{tenantToDelete.slug}</span>)?
      </p>
      <p>
        This action is non-reversible and will permanently destroy all mapped access domains, workspace settings, and active API boundaries under this tenant's logical partition.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-tenant-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Reusable Editorial Header */}
      <RegistryHeader
        title="Tenant Registry"
        subtitle="Monitor and govern isolated workspace environments, map primary access domains, adjust SLA resource tiers, and secure logical tenant partitions."
        breadcrumbs={['Hermes AI', 'Identity Registry']}
        showAction={user?.role === 'super-admin'}
        actionText="Initialize Tenant"
        onActionClick={() => router.push('/admin/collections/tenants/create')}
      />

      {/* Success Notification Banner */}
      {success && (
        <div className="mt-6 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-500/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-green-600" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-500/20 animate-fade-slide-up">
          <Icon name="error" className="text-red-500" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Control Bar: Filter Chips & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mt-8 gap-4">
        <FilterChips
          options={filterOptions}
          selectedValue={statusFilter}
          onChange={handleStatusFilterChange}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search registry by name..."
        />
      </div>

      {/* Reusable Listing Table */}
      <RegistryTable
        columns={columns}
        items={tenants}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(tenant) => router.push(`/admin/collections/tenants/${tenant.id}`)}
        emptyState={emptyState}
      />

      {/* Reusable Pagination */}
      <RegistryPagination
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalDocs={totalDocs}
        onPageChange={setPage}
        loading={loading}
      />

      {/* Reusable Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!tenantToDelete}
        title="Decommission Workspace?"
        content={decommissionContent}
        confirmText="Decommission"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setTenantToDelete(null)}
        type="danger"
      />

    </div>
  )
}
