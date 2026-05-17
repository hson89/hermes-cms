"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Button } from '@/components/ui/atoms/Button'
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
  const tierBadges = {
    standard: {
      text: 'Standard',
      icon: 'verified',
      classes: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300'
    },
    premium: {
      text: 'Premium',
      icon: 'stars',
      classes: 'bg-primary/10 text-primary'
    },
    enterprise: {
      text: 'Enterprise',
      icon: 'corporate_fare',
      classes: 'bg-[#6d5e00]/10 text-[#6d5e00] font-semibold' // Archival Gold Theme
    }
  }

  const statusBadges = {
    active: {
      text: 'Active',
      classes: 'bg-green-500/10 text-green-700 dark:text-green-400'
    },
    suspended: {
      text: 'Suspended',
      classes: 'bg-red-500/10 text-red-700 dark:text-red-400'
    },
    archived: {
      text: 'Archived',
      classes: 'bg-neutral-500/15 text-neutral-500 dark:text-neutral-400'
    }
  }

  // Format creation dates cleanly
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 border-b border-outline-variant/15 gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-outline text-[10px] uppercase font-label tracking-widest font-bold">
            <span>Hermes AI</span>
            <span className="opacity-40">/</span>
            <span>Identity Registry</span>
          </div>
          <h1 className="font-headline font-bold text-4xl lg:text-5xl text-on-surface tracking-tight leading-none mt-1">
            Tenant Registry<span className="text-primary">.</span>
          </h1>
          <p className="text-sm text-outline max-w-2xl mt-2 font-body leading-relaxed">
            Monitor and govern isolated workspace environments, map primary access domains, adjust SLA resource tiers, and secure logical tenant partitions.
          </p>
        </div>

        {/* CTA: Initialize Tenant */}
        {user?.role === 'super-admin' && (
          <Button
            type="button"
            variant="primary"
            onClick={() => router.push('/admin/collections/tenants/create')}
            className="flex items-center gap-2 font-label font-bold text-xs uppercase tracking-widest px-6 py-3.5"
          >
            <Icon name="add" size={16} />
            Initialize Tenant
          </Button>
        )}
      </div>

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
        
        {/* Horizontal Status Chips (Alexandria Tonal Styling) */}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'active', 'suspended', 'archived'] as const).map((status) => {
            const isActive = statusFilter === status
            return (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusFilterChange(status)}
                className={`
                  font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all duration-200 cursor-pointer border-none
                  ${isActive 
                    ? 'bg-primary text-on-primary font-bold shadow-md shadow-primary/10' 
                    : 'bg-surface-container-low text-outline hover:bg-surface-container-high hover:text-on-surface'
                  }
                `}
              >
                {status === 'all' ? 'All Workspaces' : status}
              </button>
            )
          })}
        </div>

        {/* Dynamic Search Box */}
        <div className="relative min-w-[280px] lg:w-96 flex items-center rounded-2xl bg-surface-container-lowest border border-outline-variant/15 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
          <Icon name="search" size={18} className="text-outline ml-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registry by name..."
            className="w-full bg-transparent border-none rounded-2xl py-3 px-3.5 font-body text-xs text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-outline hover:text-on-surface mr-3 p-1 rounded-full hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

      </div>

      {/* High-Density Editorial Listing Canvas */}
      <div className="mt-6">
        
        {/* Tonal Table Header (Public Sans Styling) */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low text-outline font-label text-[10px] uppercase tracking-widest font-bold items-center rounded-t-2xl border-none">
          <div className="col-span-4">Tenant Workspace</div>
          <div className="col-span-3">Primary Access Domain</div>
          <div className="col-span-2">Service SLA</div>
          <div className="col-span-2">Registry Status</div>
          <div className="col-span-1 text-right pr-2">Actions</div>
        </div>

        {/* Listing Rows Container */}
        <div className="flex flex-col gap-2.5 mt-2 lg:mt-0">
          {loading ? (
            /* Elegant Skeleton Loader States */
            Array.from({ length: limit }).map((_, idx) => (
              <div 
                key={idx} 
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-5 bg-surface-container-lowest items-center rounded-2xl animate-pulse"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-surface-container-high flex-shrink-0" />
                  <div className="space-y-2">
                    <div className="h-4 w-36 bg-surface-container-high rounded" />
                    <div className="h-3 w-20 bg-surface-container-high rounded" />
                  </div>
                </div>
                <div className="col-span-3">
                  <div className="h-4 w-40 bg-surface-container-high rounded" />
                </div>
                <div className="col-span-2">
                  <div className="h-6 w-20 bg-surface-container-high rounded-full" />
                </div>
                <div className="col-span-2">
                  <div className="h-6 w-16 bg-surface-container-high rounded-full" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <div className="size-8 bg-surface-container-high rounded-full" />
                </div>
              </div>
            ))
          ) : tenants.length === 0 ? (
            /* Beautiful Blank Slate/No Records View */
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
          ) : (
            /* Dynamic List Rows - Styled as borderless high-end cards */
            tenants.map((tenant) => {
              const primaryDomain = tenant.domains?.find(d => d.isPrimary) || tenant.domains?.[0]
              const otherDomainsCount = tenant.domains ? tenant.domains.length - 1 : 0
              
              // Resolve active tier and status configuration details
              const tierConf = tierBadges[tenant.tier] || tierBadges.standard
              const statusConf = statusBadges[tenant.status] || statusBadges.active

              // Circle initial letter badge
              const firstLetter = tenant.name ? tenant.name.charAt(0).toUpperCase() : 'W'

              return (
                <div
                  key={tenant.id}
                  onClick={() => router.push(`/admin/collections/tenants/${tenant.id}`)}
                  className={`
                    grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-4.5 bg-surface-container-lowest lg:bg-surface-container-lowest/70 hover:bg-surface-container-lowest items-center rounded-2xl border-l-[3px] border-transparent hover:border-primary transition-all duration-300 shadow-sm hover:shadow shadow-on-surface/5 cursor-pointer relative group
                  `}
                >
                  {/* Column 1: Tenant Profile details */}
                  <div className="col-span-4 flex items-center gap-3.5">
                    {/* Upper decorative monogram avatar */}
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

                  {/* Column 2: Mapped Hostname highlights */}
                  <div className="col-span-3 flex flex-col lg:block items-start gap-1">
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
                            className="inline-flex size-4 rounded-full bg-[#6d5e00]/10 text-[#6d5e00] items-center justify-center text-[10px] flex-shrink-0"
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

                  {/* Column 3: SLA Service Tier */}
                  <div className="col-span-2 flex lg:block items-center justify-between">
                    <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Service Tier</span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider ${tierConf.classes}`}>
                      <Icon name={tierConf.icon} size={11} filled />
                      {tierConf.text}
                    </span>
                  </div>

                  {/* Column 4: Registry Status */}
                  <div className="col-span-2 flex lg:block items-center justify-between">
                    <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Active Status</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-label font-bold uppercase tracking-wider ${statusConf.classes}`}>
                      {statusConf.text}
                    </span>
                  </div>

                  {/* Column 5: Actions Menu Trigger */}
                  <div className="col-span-1 flex lg:justify-end items-center justify-end">
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

                </div>
              )
            })
          )}
        </div>

      </div>

      {/* Editorial Pagination Footer (Dynamic Payload mapping) */}
      {!loading && tenants.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center mt-10 pb-6 pt-4 border-t border-outline-variant/15 gap-4">
          
          {/* Metadata counts */}
          <div className="text-xs text-outline font-body">
            Showing <span className="font-semibold text-on-surface">{Math.min((page - 1) * limit + 1, totalDocs)}</span> to{' '}
            <span className="font-semibold text-on-surface">{Math.min(page * limit, totalDocs)}</span> of{' '}
            <span className="font-semibold text-on-surface">{totalDocs}</span> active registry records.
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5">
            {/* Back button */}
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="size-9 rounded-full bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all border-none cursor-pointer"
            >
              <Icon name="chevron_left" size={18} />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: totalPages }).map((_, i) => {
              const pNum = i + 1
              const isActive = page === pNum
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`
                    size-9 rounded-full text-xs font-label font-bold uppercase transition-all duration-200 cursor-pointer border-none
                    ${isActive 
                      ? 'bg-primary text-on-primary shadow-sm shadow-primary/10' 
                      : 'bg-surface-container text-outline hover:bg-surface-container-high hover:text-on-surface'
                    }
                  `}
                >
                  {pNum}
                </button>
              )
            })}

            {/* Forward button */}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="size-9 rounded-full bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all border-none cursor-pointer"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>

        </div>
      )}

      {/* Custom Glassmorphic Decommissioning Modal */}
      {tenantToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-fade-in">
          
          <div 
            className="bg-surface/90 backdrop-blur-[20px] max-w-md w-full rounded-2xl p-6 border border-outline-variant/15 shadow-2xl flex flex-col space-y-4 animate-fade-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Icon name="warning" size={20} className="text-red-500" />
              </div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Decommission Workspace?</h3>
            </div>

            <div className="font-body text-xs text-outline leading-relaxed space-y-2">
              <p>
                Are you absolutely sure you want to delete <span className="font-bold text-on-surface">{tenantToDelete.name}</span> (slug: <span className="font-mono bg-surface-container px-1 py-0.5 rounded text-on-surface">{tenantToDelete.slug}</span>)?
              </p>
              <p>
                This action is non-reversible and will permanently destroy all mapped access domains, workspace settings, and active API boundaries under this tenant's logical partition.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTenantToDelete(null)}
                className="border border-outline-variant/30 text-on-surface hover:bg-surface-container py-2.5 px-4.5 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-label font-bold text-xs uppercase tracking-widest py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
              >
                {isDeleting ? (
                  <>
                    Decommissioning...
                    <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  </>
                ) : (
                  <>
                    Decommission
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
