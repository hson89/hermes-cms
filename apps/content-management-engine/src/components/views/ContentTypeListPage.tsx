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
import type { User } from '@/payload-types'

interface ContentTypeField {
  name: string
  label?: string
  type: string
  required?: boolean
  description?: string
}

interface ContentTypeSchema {
  name: string
  slug: string
  fields?: ContentTypeField[]
}

interface ContentType {
  id: string
  name: string
  slug: string
  status: 'draft' | 'published'
  schema?: ContentTypeSchema
  generatedByAI?: boolean
  aiSessionId?: string
  isGlobal?: boolean
  createdAt: string
  updatedAt: string
}

export const ContentTypeListPage: React.FC = () => {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // API List States
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'ai'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [schemaToDelete, setSchemaToDelete] = useState<ContentType | null>(null)
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
  const handleFilterChange = (val: 'all' | 'draft' | 'published' | 'ai') => {
    setFilter(val)
    setPage(1)
  }

  // Live Fetch registry
  const fetchContentTypes = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/content-types?limit=${limit}&page=${page}&sort=-createdAt`

      // Build standard Payload REST API filters
      const filterParts: string[] = []

      if (filter === 'draft') {
        filterParts.push('where[status][equals]=draft')
      } else if (filter === 'published') {
        filterParts.push('where[status][equals]=published')
      } else if (filter === 'ai') {
        filterParts.push('where[generatedByAI][equals]=true')
      }

      if (debouncedSearch.trim()) {
        const query = encodeURIComponent(debouncedSearch.trim())
        // Search by name OR slug
        filterParts.push(`where[or][0][name][like]=${query}&where[or][1][slug][like]=${query}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve content type schemas.')
      
      const data = await res.json()
      setContentTypes(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading content types.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContentTypes()
  }, [page, debouncedSearch, filter])

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

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Deletion logic
  const triggerDelete = (contentType: ContentType, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(null)
    setSchemaToDelete(contentType)
  }

  const handleDeleteConfirm = async () => {
    if (!schemaToDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/content-types/${schemaToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to delete the content type.')
      }

      setSuccess(`Content Type schema "${schemaToDelete.name}" was successfully decommissioned.`)
      setSchemaToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      // Reload listing
      if (contentTypes.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        fetchContentTypes()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to decommission Content Type schema.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClone = async (contentType: ContentType, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(null)
    setLoading(true)
    setError('')
    try {
      const typedUser = currentUser as unknown as User
      const firstTenantRelation = typedUser?.tenants?.[0]?.tenant
      const activeTenantId =
        firstTenantRelation && typeof firstTenantRelation === 'object'
          ? firstTenantRelation.id
          : firstTenantRelation
      if (!activeTenantId) {
        throw new Error('No active tenant associated with your user session.')
      }

      // Generate a unique slug/name for the cloned version
      const cloneName = `Copy of ${contentType.name}`
      const baseSlug = `${contentType.slug}-copy`
      
      const payload = {
        name: cloneName,
        slug: baseSlug,
        status: 'draft',
        schema: contentType.schema,
        generatedByAI: false,
        tenant: activeTenantId,
        isGlobal: false,
      }

      const res = await fetch('/api/content-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to clone the content type.')
      }

      setSuccess(`Content Type schema successfully cloned as "${cloneName}".`)
      setTimeout(() => setSuccess(''), 3000)
      fetchContentTypes()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to clone Content Type schema.')
    } finally {
      setLoading(false)
    }
  }

  const filterOptions: FilterOption<'all' | 'draft' | 'published' | 'ai'>[] = [
    { value: 'all', label: 'All Schemas' },
    { value: 'draft', label: 'Drafts' },
    { value: 'published', label: 'Published' },
    { value: 'ai', label: 'AI Generated' },
  ]

  const columns: TableColumn<ContentType>[] = [
    {
      key: 'identity',
      label: 'Content Type Identity',
      span: 4,
      renderCell: (contentType) => {
        const firstLetter = contentType.name ? contentType.name.charAt(0).toUpperCase() : 'C'
        return (
          <div className="flex items-center gap-3.5">
            {/* Monogram Monogram Icon */}
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              {firstLetter}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                  {contentType.name || 'Untitled Schema'}
                </span>
                {contentType.isGlobal && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-gold/15 text-gold border border-gold/10 uppercase tracking-widest leading-none">
                    Global
                  </span>
                )}
              </div>
              <span className="block font-mono text-[10px] text-outline mt-0.5 max-w-[240px] truncate">
                {contentType.slug}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'generation',
      label: 'AI Orchestration',
      span: 2,
      renderCell: (contentType) => {
        const isAI = contentType.generatedByAI
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">AI Scoped</span>
            {isAI ? (
              <Badge color="gold" icon="auto_awesome" size="md">
                AI Generated
              </Badge>
            ) : (
              <Badge color="neutral" icon="edit_note" size="md">
                Manual
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      key: 'fields',
      label: 'Fields Specification',
      span: 4,
      renderCell: (contentType) => {
        const fields = contentType.schema?.fields || []
        const count = fields.length
        const preview = fields.slice(0, 3).map(f => f.label || f.name).join(', ')
        const suffix = count > 3 ? '...' : ''
        
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Fields Specification</span>
            {count > 0 ? (
              <div className="flex items-center gap-2 max-w-full">
                <Badge color="primary" size="sm">
                  {count} {count === 1 ? 'Field' : 'Fields'}
                </Badge>
                <span className="text-outline-variant text-[11px] font-body truncate max-w-[180px] lg:max-w-[220px]">
                  {preview}{suffix}
                </span>
              </div>
            ) : (
              <span className="text-outline text-xs italic font-body">No fields defined</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Registry Status',
      span: 1,
      renderCell: (contentType) => {
        const isPublished = contentType.status === 'published'
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Status</span>
            <Badge color={isPublished ? 'success' : 'neutral'} size="md">
              {contentType.status}
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
      renderCell: (contentType) => {
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(contentType.id, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {/* Contextual Action Dropdown (Glassmorphism design) */}
            {activeMenuId === contentType.id && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {(contentType.isGlobal || (currentUser as unknown as User)?.role === 'super-admin') && (
                  <button
                    type="button"
                    onClick={(e) => handleClone(contentType, e)}
                    className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Icon name="content_copy" size={14} className="text-primary" />
                    Clone Schema
                  </button>
                )}

                {(!contentType.isGlobal || (currentUser as unknown as User)?.role === 'super-admin') && (
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/draft/${contentType.id}`)}
                    className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-primary hover:bg-primary/5 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Icon name="auto_awesome" size={14} className="text-primary" />
                    Draft with AI
                  </button>
                )}

                {(!contentType.isGlobal || (currentUser as unknown as User)?.role === 'super-admin') && (
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/collections/content-types/${contentType.id}`)}
                    className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Icon name="edit" size={14} />
                    Edit Specifications
                  </button>
                )}

                {(!contentType.isGlobal || (currentUser as unknown as User)?.role === 'super-admin') && (
                  <button
                    type="button"
                    onClick={(e) => triggerDelete(contentType, e)}
                    className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-error hover:bg-error/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Icon name="delete" size={14} className="text-error" />
                    Delete Schema
                  </button>
                )}
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
        <Icon name="layers" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Content Types Registered</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || filter !== 'all' 
          ? 'No schema models fit the active filters or search parameters. Refine your query.' 
          : 'Unlock conversational content architecture by building your first dynamic schema model.'}
      </p>
      {(debouncedSearch || filter !== 'all') && (
        <button
          type="button"
          onClick={() => { setSearch(''); setFilter('all') }}
          className="mt-4 border border-outline-variant/15 text-primary hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  const deleteContent = schemaToDelete ? (
    <div className="space-y-2">
      <p>
        Are you absolutely sure you want to delete the content type model <span className="font-bold text-on-surface">{schemaToDelete.name}</span> (slug: <span className="font-mono bg-surface-container px-1 py-0.5 rounded text-on-surface">{schemaToDelete.slug}</span>)?
      </p>
      <p>
        This action is non-reversible and will permanently destroy the schema specifications and restrict creators from adding new items under this model.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-content-type-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Reusable Editorial Header */}
      <RegistryHeader
        title="Content Types Registry"
        subtitle="Govern dynamic content schema models, control AI-assisted definitions, inspect field signatures, and verify multi-tenant data boundaries."
        breadcrumbs={[BRANDING.appName, 'Schema Registry']}
        showAction={true}
        actionText="Create Content Type"
        actionIcon="add"
        onActionClick={() => router.push('/admin/collections/content-types/create')}
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
          selectedValue={filter}
          onChange={handleFilterChange}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search schemas by name or slug..."
        />
      </div>

      {/* Reusable Listing Table */}
      <RegistryTable
        columns={columns}
        items={contentTypes}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(contentType) => router.push(`/admin/collections/content-types/${contentType.id}`)}
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
        isOpen={!!schemaToDelete}
        title="Delete Content Type Schema?"
        content={deleteContent}
        confirmText="Delete Schema"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSchemaToDelete(null)}
        type="danger"
      />

    </div>
  )
}
