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
import { ContentItem, ContentType, Tenant } from '@/payload-types'

export const ContentItemListPage: React.FC = () => {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // API List States
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hostedSites, setHostedSites] = useState<any[]>([])

  // Fetch all active hosted-sites once to map preview URLs
  useEffect(() => {
    const fetchHostedSites = async () => {
      try {
        const res = await fetch('/api/hosted-sites?limit=100')
        if (res.ok) {
          const data = await res.json()
          setHostedSites(data.docs || [])
        }
      } catch (err) {
        console.error('Failed to load hosted sites for preview mapping:', err)
      }
    }
    fetchHostedSites()
  }, [])

  // Debounce search inputs to avoid heavy live refetching
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search change
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // Reset page when changing filters
  const handleStatusFilterChange = (status: 'all' | 'draft' | 'published') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Live Fetch registry
  const fetchContentItems = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/content-items?limit=${limit}&page=${page}&sort=-createdAt&depth=1`

      // Build standard Payload REST API filters
      const filterParts: string[] = []

      if (statusFilter !== 'all') {
        filterParts.push(`where[status][equals]=${statusFilter}`)
      }

      if (debouncedSearch.trim()) {
        const query = encodeURIComponent(debouncedSearch.trim())
        filterParts.push(`where[title][like]=${query}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve content items registry.')
      
      const data = await res.json()
      setContentItems(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading content items.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContentItems()
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
  const triggerDelete = (item: ContentItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(null)
    setItemToDelete(item)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/content-items/${itemToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to delete the content entry.')
      }

      setSuccess(`Content entry "${itemToDelete.title}" was successfully deleted.`)
      setItemToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      // Reload listing
      if (contentItems.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        fetchContentItems()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to delete the content entry.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filterOptions: FilterOption<'all' | 'draft' | 'published'>[] = [
    { value: 'all', label: 'All Entries' },
    { value: 'draft', label: 'Drafts' },
    { value: 'published', label: 'Published' },
  ]

  const columns: TableColumn<ContentItem>[] = [
    {
      key: 'identity',
      label: 'Content Title',
      span: 4,
      renderCell: (item) => {
        const firstLetter = item.title ? item.title.charAt(0).toUpperCase() : 'C'
        return (
          <div className="flex items-center gap-3.5">
            {/* Monogram Monogram Avatar */}
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              {firstLetter}
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {item.title || 'Untitled Entry'}
              </span>
              <span className="block font-mono text-[10px] text-outline mt-0.5 max-w-[240px] truncate">
                ID: {item.id}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'contentType',
      label: 'Content Type',
      span: 3,
      renderCell: (item) => {
        const contentTypeVal = item.contentType
        const contentTypeName = typeof contentTypeVal === 'object' && contentTypeVal !== null
          ? (contentTypeVal as ContentType).name
          : `Type: ${contentTypeVal}`
        
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Content Type</span>
            <Badge color="primary" size="md" icon="layers">
              {contentTypeName}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'tenant',
      label: 'Workspace Tenant',
      span: 3,
      renderCell: (item) => {
        const tenantVal = item.tenant
        const tenantName = typeof tenantVal === 'object' && tenantVal !== null
          ? (tenantVal as Tenant).name
          : `Tenant: ${tenantVal}`
        
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Tenant Workspace</span>
            {item.tenant ? (
              <Badge color="neutral" size="md" icon="workspaces">
                {tenantName}
              </Badge>
            ) : (
              <Badge color="gold" size="md">
                Global Scope
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      span: 1,
      renderCell: (item) => {
        const isPublished = item.status === 'published'
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Status</span>
            <Badge color={isPublished ? 'success' : 'neutral'} size="md">
              {item.status}
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
      renderCell: (item) => {
        const itemIdStr = String(item.id)

        // Resolve tenant slug and article slug
        const tenantSlug = typeof item.tenant === 'object' && item.tenant !== null ? item.tenant.slug : null
        const articleSlug = (item.fieldsData && typeof item.fieldsData === 'object' && !Array.isArray(item.fieldsData))
          ? (item.fieldsData as Record<string, any>).slug
          : null

        let previewUrl: string | null = null
        if (tenantSlug && articleSlug) {
          // Find matching hosted site for the tenant
          const itemTenantId = typeof item.tenant === 'object' && item.tenant !== null ? item.tenant.id : item.tenant
          const hostedSite = hostedSites.find(site => {
            const siteTenantId = typeof site.tenant === 'object' && site.tenant !== null ? site.tenant.id : site.tenant
            return String(siteTenantId) === String(itemTenantId)
          })

          let baseUrl = 'http://localhost:3001' // Default local dev port for Next.js blog
          if (hostedSite) {
            if (hostedSite.template === 'astro-portfolio') {
              baseUrl = 'http://localhost:3002'
            } else if (hostedSite.template === 'nextjs-blog') {
              baseUrl = 'http://localhost:3001'
            }
          }
          previewUrl = `${baseUrl}/${tenantSlug}/${articleSlug}`
        }

        return (
          <div className="flex lg:justify-end items-center justify-end gap-1">
            {previewUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(previewUrl!, '_blank')
                }}
                title="Preview in Frontend"
                className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-primary transition-all border-none bg-transparent cursor-pointer relative"
              >
                <Icon name="visibility" size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => toggleMenu(itemIdStr, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {/* Contextual Action Dropdown (Glassmorphism layout) */}
            {activeMenuId === itemIdStr && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(previewUrl!, '_blank')
                      setActiveMenuId(null)
                    }}
                    className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Icon name="visibility" size={14} />
                    Preview Entry
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/content-items/${item.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="edit" size={14} />
                  Edit Entry
                </button>

                <button
                  type="button"
                  onClick={(e) => triggerDelete(item, e)}
                  className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-error hover:bg-error/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="delete" size={14} className="text-error" />
                  Delete Entry
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
        <Icon name="description" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Content Entries</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || statusFilter !== 'all' 
          ? 'No content items match your active filters or search criteria. Refine your query.' 
          : 'Create your first editorial content item under an established schema model.'}
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

  const deleteContent = itemToDelete ? (
    <div className="space-y-2">
      <p>
        Are you absolutely sure you want to delete the content entry <span className="font-bold text-on-surface">{itemToDelete.title}</span>?
      </p>
      <p>
        This action is non-reversible and will permanently destroy this content entry from the database.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-tenant-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Reusable Editorial Header */}
      <RegistryHeader
        title="Content Items Registry"
        subtitle="Govern and explore multi-tenant editorial content entries, manage document draft statuses, and verify API delivery schema compliance."
        breadcrumbs={[BRANDING.appName, 'Content Registry']}
        showAction={false}
      />

      {/* Success Notification Banner */}
      {success && (
        <div className="mt-6 p-4 bg-success/10 text-success rounded-xl flex items-center gap-3 border border-success/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-success" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="mt-6 p-4 bg-error/10 text-error rounded-xl flex items-center gap-3 border border-error/20 animate-fade-slide-up">
          <Icon name="error" className="text-error" />
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
          placeholder="Search entries by title..."
        />
      </div>

      {/* Reusable Listing Table */}
      <RegistryTable
        columns={columns}
        items={contentItems}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(item) => router.push(`/admin/collections/content-items/${item.id}`)}
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

      {/* Reusable Decommission Modal */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        title="Delete Content Entry?"
        content={deleteContent}
        confirmText="Delete Entry"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setItemToDelete(null)}
        type="danger"
      />

    </div>
  )
}
