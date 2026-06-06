"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'
import { BRANDING } from '@/constants/branding'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { FilterChips, FilterOption } from '@/components/ui/molecules/FilterChips'
import { RegistryTable, TableColumn } from '@/components/ui/organisms/RegistryTable'
import { RegistryPagination } from '@/components/ui/molecules/RegistryPagination'
import { ConfirmationModal } from '@/components/ui/organisms/ConfirmationModal'
import { Badge } from '@/components/ui/atoms/Badge'

interface Tenant {
  id: string
  name: string
}

interface HostedSite {
  id: string
  name: string
  template: 'nextjs-blog' | 'astro-portfolio'
  domain?: string
  status: 'pending' | 'deploying' | 'active' | 'failed'
  deployedUrl?: string
  tenant: string | Tenant
  createdAt: string
  updatedAt: string
}

export const HostedSiteListPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()

  // API List States
  const [sites, setSites] = useState<HostedSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'deploying' | 'active' | 'failed'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [siteToDelete, setSiteToDelete] = useState<HostedSite | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const handleStatusFilterChange = (status: 'all' | 'pending' | 'deploying' | 'active' | 'failed') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Live Fetch registry
  const fetchSites = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/hosted-sites?limit=${limit}&page=${page}&sort=-createdAt&depth=1`

      const filterParts: string[] = []

      if (statusFilter !== 'all') {
        filterParts.push(`where[status][equals]=${statusFilter}`)
      }

      if (debouncedSearch.trim()) {
        const query = encodeURIComponent(debouncedSearch.trim())
        filterParts.push(`where[or][0][name][like]=${query}&where[or][1][domain][like]=${query}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve hosted sites registry.')
      
      const data = await res.json()
      setSites(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading hosted sites.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [page, debouncedSearch, statusFilter])

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(activeMenuId === id ? null : id)
  }

  useEffect(() => {
    const closeAll = () => setActiveMenuId(null)
    window.addEventListener('click', closeAll)
    return () => window.removeEventListener('click', closeAll)
  }, [])

  const handleCopyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    setSuccess(`URL "${url}" copied to clipboard!`)
    setTimeout(() => setSuccess(''), 2500)
    setActiveMenuId(null)
  }

  const triggerDelete = (site: HostedSite, e: React.MouseEvent) => {
    e.stopPropagation()
    setSiteToDelete(site)
    setActiveMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/hosted-sites/${siteToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to delete the site.')
      }

      setSuccess(`Site "${siteToDelete.name}" was successfully decommissioned.`)
      setSiteToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      fetchSites()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to decommission hosted site.')
    } finally {
      setIsDeleting(false)
    }
  }

  const statusBadges: Record<HostedSite['status'], { text: string; color: 'success' | 'primary' | 'neutral' | 'danger' }> = {
    active: { text: 'Active', color: 'success' },
    deploying: { text: 'Deploying', color: 'primary' },
    pending: { text: 'Pending', color: 'neutral' },
    failed: { text: 'Failed', color: 'danger' },
  }

  const templateLabels: Record<HostedSite['template'], string> = {
    'nextjs-blog': 'Next.js Blog',
    'astro-portfolio': 'Astro Portfolio',
  }

  const filterOptions: FilterOption<'all' | 'pending' | 'deploying' | 'active' | 'failed'>[] = [
    { value: 'all', label: 'All Sites' },
    { value: 'active', label: 'Active' },
    { value: 'deploying', label: 'Deploying' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ]

  const columns: TableColumn<HostedSite>[] = [
    {
      key: 'name',
      label: 'Site Identity',
      span: 4,
      renderCell: (site) => {
        const firstLetter = site.name ? site.name.charAt(0).toUpperCase() : 'S'
        return (
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              {firstLetter}
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {site.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge color="neutral" size="sm" className="font-label text-[9px] uppercase tracking-wider">
                  {templateLabels[site.template]}
                </Badge>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'url',
      label: 'Access Endpoint',
      span: 3,
      renderCell: (site) => {
        const displayUrl = site.domain || site.deployedUrl
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Endpoint</span>
            {displayUrl ? (
              <a
                href={displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-xs text-on-surface hover:text-primary transition-colors flex items-center gap-1.5"
              >
                {displayUrl.replace(/^https?:\/\//, '')}
                <Icon name="open_in_new" size={12} />
              </a>
            ) : (
              <span className="text-outline text-xs italic font-body">Not deployed yet</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'tenant',
      label: 'Tenant Owner',
      span: 2,
      renderCell: (site) => {
        const tenantName = typeof site.tenant === 'object' ? site.tenant.name : `Tenant #${site.tenant}`
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Owner</span>
            <Badge color="primary" size="md">
              {tenantName}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Deployment Status',
      span: 2,
      renderCell: (site) => {
        const statusConf = statusBadges[site.status]
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Status</span>
            <Badge color={statusConf.color} size="md" icon={site.status === 'deploying' ? 'sync' : undefined} className={site.status === 'deploying' ? 'animate-spin-slow' : ''}>
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
      renderCell: (site) => {
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(site.id, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {activeMenuId === site.id && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/hosted-sites/${site.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="edit" size={14} />
                  Edit Settings
                </button>
                
                {(site.deployedUrl || site.domain) && (
                  <button
                    type="button"
                    onClick={(e) => handleCopyUrl(site.domain || site.deployedUrl || '', e)}
                    className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Icon name="content_copy" size={14} />
                    Copy Endpoint
                  </button>
                )}

                <div className="h-[1px] bg-outline-variant/15 my-1" />

                <button
                  type="button"
                  onClick={(e) => triggerDelete(site, e)}
                  className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-error hover:bg-error/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="delete" size={14} className="text-error" />
                  Delete Site
                </button>
              </div>
            )}
          </div>
        )
      }
    }
  ]

  const emptyState = (
    <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/15 flex flex-col items-center justify-center">
      <div className="size-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 text-outline-variant">
        <Icon name="web" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Sites Deployed</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || statusFilter !== 'all' 
          ? 'No sites fit the active filters or search parameters.' 
          : 'Provision your first managed front-end template to start delivering content.'}
      </p>
      {(debouncedSearch || statusFilter !== 'all') && (
        <button
          type="button"
          onClick={() => { setSearch(''); setStatusFilter('all') }}
          className="mt-4 border border-outline-variant/15 text-primary hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  const deleteContent = siteToDelete ? (
    <div className="space-y-2">
      <p>
        Are you absolutely sure you want to delete <span className="font-bold text-on-surface">{siteToDelete.name}</span>?
      </p>
      <p>
        This will permanently destroy the managed deployment and revoke access to the associated endpoint.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-site-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      <RegistryHeader
        title="Hosted Sites"
        subtitle="Manage and monitor template deployments across your tenant workspaces. View live endpoints, deployment statuses, and provision new starter sites."
        breadcrumbs={[BRANDING.appName, 'Managed Infrastructure']}
        showAction={false}
      />

      {success && (
        <div className="mt-6 p-4 bg-success/10 text-success rounded-xl flex items-center gap-3 border border-success/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-success" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-error/10 text-error rounded-xl flex items-center gap-3 border border-error/20 animate-fade-slide-up">
          <Icon name="error" className="text-error" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mt-8 gap-4">
        <FilterChips
          options={filterOptions}
          selectedValue={statusFilter}
          onChange={handleStatusFilterChange}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search sites by name or domain..."
        />
      </div>

      <RegistryTable
        columns={columns}
        items={sites}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(site) => router.push(`/admin/collections/hosted-sites/${site.id}`)}
        emptyState={emptyState}
      />

      <RegistryPagination
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalDocs={totalDocs}
        onPageChange={setPage}
        loading={loading}
      />

      <ConfirmationModal
        isOpen={!!siteToDelete}
        title="Decommission Site?"
        content={deleteContent}
        confirmText="Decommission"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSiteToDelete(null)}
        type="danger"
      />

    </div>
  )
}
