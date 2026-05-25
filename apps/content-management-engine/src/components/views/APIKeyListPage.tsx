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
import { ApiKey, Tenant } from '@/payload-types'

export const APIKeyListPage: React.FC = () => {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // API List States
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [apiKeyToDelete, setApiKeyToDelete] = useState<ApiKey | null>(null)
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
  const handleStatusFilterChange = (status: 'all' | 'active' | 'expired') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Live Fetch registry
  const fetchApiKeys = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/api-keys?limit=${limit}&page=${page}&sort=-createdAt&depth=1`

      // Build standard Payload REST API filters
      const filterParts: string[] = []
      const nowISO = new Date().toISOString()

      if (debouncedSearch.trim()) {
        const query = encodeURIComponent(debouncedSearch.trim())
        if (statusFilter === 'all') {
          // Search only (label OR email)
          filterParts.push(`where[or][0][label][like]=${query}&where[or][1][email][like]=${query}`)
        } else if (statusFilter === 'expired') {
          // Search AND expired: (label OR email) AND (expiresAt < now)
          filterParts.push(`where[and][0][or][0][label][like]=${query}&where[and][0][or][1][email][like]=${query}`)
          filterParts.push(`where[and][1][expiresAt][less_than]=${nowISO}`)
        } else if (statusFilter === 'active') {
          // Search AND active: (label OR email) AND (expiresAt >= now OR expiresAt is null)
          filterParts.push(`where[and][0][or][0][label][like]=${query}&where[and][0][or][1][email][like]=${query}`)
          filterParts.push(`where[and][1][or][0][expiresAt][greater_than_equal]=${nowISO}&where[and][1][or][1][expiresAt][exists]=false`)
        }
      } else {
        if (statusFilter === 'expired') {
          // Expired only
          filterParts.push(`where[expiresAt][less_than]=${nowISO}`)
        } else if (statusFilter === 'active') {
          // Active only: (expiresAt >= now OR expiresAt is null)
          filterParts.push(`where[or][0][expiresAt][greater_than_equal]=${nowISO}&where[or][1][expiresAt][exists]=false`)
        }
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve API keys registry.')
      
      const data = await res.json()
      const docs = (data.docs || []) as ApiKey[]

      setApiKeys(docs)
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading API keys.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeys()
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

  // Deletion logic
  const triggerDelete = (apiKey: ApiKey, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(null)
    setApiKeyToDelete(apiKey)
  }

  const handleDeleteConfirm = async () => {
    if (!apiKeyToDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/api-keys/${apiKeyToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to revoke the API key.')
      }

      setSuccess(`API Key "${apiKeyToDelete.label}" was successfully revoked and decommissioned.`)
      setApiKeyToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      // Reload listing
      if (apiKeys.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        fetchApiKeys()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to revoke API key.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filterOptions: FilterOption<'all' | 'active' | 'expired'>[] = [
    { value: 'all', label: 'All Keys' },
    { value: 'active', label: 'Active Keys' },
    { value: 'expired', label: 'Expired Keys' },
  ]

  const columns: TableColumn<ApiKey>[] = [
    {
      key: 'identity',
      label: 'API Key Details',
      span: 4,
      renderCell: (apiKey) => {
        return (
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              <Icon name="vpn_key" size={18} />
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {apiKey.label || 'API Key'}
              </span>
              <span className="block font-mono text-[10px] text-outline mt-0.5 max-w-[240px] truncate">
                {apiKey.email}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'tenant',
      label: 'Workspace Tenant',
      span: 4,
      renderCell: (apiKey) => {
        const tenantName = typeof apiKey.tenant === 'object' && apiKey.tenant !== null
          ? (apiKey.tenant as Tenant).name
          : `Tenant ID: ${apiKey.tenant}`
        
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Workspace Tenant</span>
            {apiKey.tenant ? (
              <Badge color="primary" size="md" icon="workspaces">
                {tenantName}
              </Badge>
            ) : (
              <Badge color="gold" size="md">
                Global Admin Scope
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      key: 'expires',
      label: 'Status & Expiration',
      span: 3,
      renderCell: (apiKey) => {
        const now = new Date()
        const isExpired = apiKey.expiresAt ? new Date(apiKey.expiresAt) < now : false
        const isSuspended = apiKey.enableAPIKey === false
        
        let badgeColor: 'danger' | 'success' | 'warning' = 'success'
        let badgeText = 'Active'
        
        if (isSuspended) {
          badgeColor = 'warning'
          badgeText = 'Suspended'
        } else if (isExpired) {
          badgeColor = 'danger'
          badgeText = 'Expired'
        }
        
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Status &amp; Expiration</span>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={badgeColor} size="sm" icon={isSuspended ? 'block' : isExpired ? 'error' : 'check_circle'}>
                {badgeText}
              </Badge>
              <span className="font-body text-xs text-outline">
                {apiKey.expiresAt 
                  ? `Expires: ${new Date(apiKey.expiresAt).toLocaleDateString()}` 
                  : 'Never Expires'
                }
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 1,
      headerClassName: 'text-right pr-2',
      renderCell: (apiKey) => {
        const keyIdStr = String(apiKey.id)
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(keyIdStr, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {/* Premium Contextual Action Dropdown (Glassmorphism layout) */}
            {activeMenuId === keyIdStr && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/api-keys/${apiKey.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="edit" size={14} />
                  Edit Settings
                </button>

                <button
                  type="button"
                  onClick={(e) => triggerDelete(apiKey, e)}
                  className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-red-600 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="delete" size={14} className="text-red-500" />
                  Revoke Key
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
        <Icon name="vpn_key" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No API Keys Generated</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || statusFilter !== 'all' 
          ? 'No active credentials fit the filter or search parameters. Refine your query.' 
          : 'Generate programmatic API tokens to query your isolated multi-tenant headless CMS delivery endpoints.'}
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

  const deleteContent = apiKeyToDelete ? (
    <div className="space-y-2">
      <p>
        Are you absolutely sure you want to revoke the API Key for <span className="font-bold text-on-surface">{apiKeyToDelete.label}</span>?
      </p>
      <p>
        This action is non-reversible. Any programmatic build hooks, Jamstack frontend integrations, or CI/CD pipelines utilizing this token will be immediately blocked from delivery access boundaries.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-api-key-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Reusable Editorial Header */}
      <RegistryHeader
        title="API Keys Registry"
        subtitle="Provision and govern secure, long-lived API keys for programmatic delivery endpoints, isolate credentials by tenant, and audit access credentials."
        breadcrumbs={['Hermes AI', 'Developer Credentials']}
        showAction={false}
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
          placeholder="Search by key label or email..."
        />
      </div>

      {/* Reusable Listing Table */}
      <RegistryTable
        columns={columns}
        items={apiKeys}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(key) => router.push(`/admin/collections/api-keys/${key.id}`)}
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

      {/* Reusable Revocation Modal */}
      <ConfirmationModal
        isOpen={!!apiKeyToDelete}
        title="Revoke API Access Key?"
        content={deleteContent}
        confirmText="Revoke Access Key"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setApiKeyToDelete(null)}
        type="danger"
      />

    </div>
  )
}
