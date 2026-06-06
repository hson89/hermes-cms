"use client"

import React, { useState, useEffect, useMemo } from 'react'
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

interface BuildingBlock {
  id: string
  name: string
  slug: string
  category: 'layout' | 'media' | 'text' | 'interactive'
  status: 'active' | 'deprecated'
  thumbnail?: {
    url: string
  }
  usageCount?: number
  updatedAt: string
}

const CATEGORIES: FilterOption<'all' | 'layout' | 'media' | 'text' | 'interactive'>[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Layout', value: 'layout' },
  { label: 'Media', value: 'media' },
  { label: 'Text', value: 'text' },
  { label: 'Interactive', value: 'interactive' },
]

export const BuildingBlockLibrary: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()

  // API List States
  const [blocks, setBlocks] = useState<BuildingBlock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'layout' | 'media' | 'text' | 'interactive'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [blockToDelete, setBlockToDelete] = useState<BuildingBlock | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const activeTenantId = useMemo(() => {
    const typedUser = user as unknown as User
    const firstTenantRelation = typedUser?.tenants?.[0]?.tenant
    if (firstTenantRelation && typeof firstTenantRelation === 'object') {
      return firstTenantRelation.id
    }
    return firstTenantRelation
  }, [user])

  const isSuperAdmin = useMemo(() => {
    return (user as unknown as User)?.role === 'super-admin'
  }, [user])

  // Fetch building blocks
  const fetchBlocks = async () => {
    if (!user) return
    if (!isSuperAdmin && !activeTenantId) return

    try {
      setIsLoading(true)
      setError(null)
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `JWT ${token}`

      const url = isSuperAdmin
        ? '/api/building-blocks?depth=1&limit=100&sort=-createdAt'
        : `/api/building-blocks?depth=1&limit=100&where[tenant][equals]=${activeTenantId}&sort=-createdAt`

      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Failed to retrieve building blocks.')
      
      const data = await res.json()
      
      const mappedBlocks: BuildingBlock[] = data.docs.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        slug: doc.slug,
        category: doc.category || 'layout',
        status: doc.status || 'active',
        thumbnail: doc.thumbnail,
        usageCount: doc.usageCount ?? 0,
        updatedAt: doc.updatedAt
      }))

      setBlocks(mappedBlocks)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBlocks()
  }, [user, activeTenantId, isSuperAdmin])

  // Filter and search logic on client side
  const filteredBlocks = useMemo(() => {
    return blocks.filter(block => {
      const matchesSearch = block.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           block.slug.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = activeCategory === 'all' || block.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [blocks, searchQuery, activeCategory])

  // Slice paginated items
  const paginatedBlocks = useMemo(() => {
    return filteredBlocks.slice((page - 1) * limit, page * limit)
  }, [filteredBlocks, page, limit])

  const totalPages = Math.max(Math.ceil(filteredBlocks.length / limit), 1)
  const totalDocs = filteredBlocks.length

  // Reset page when search or category changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery, activeCategory])

  // Action Menu Helpers
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(activeMenuId === id ? null : id)
  }

  useEffect(() => {
    const closeAll = () => setActiveMenuId(null)
    window.addEventListener('click', closeAll)
    return () => window.removeEventListener('click', closeAll)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const triggerDelete = (block: BuildingBlock, e: React.MouseEvent) => {
    e.stopPropagation()
    setBlockToDelete(block)
    setActiveMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!blockToDelete) return
    setIsDeleting(true)
    try {
      // Include JWT auth header — consistent with all other fetch calls in this component
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = {}
      if (token) headers['Authorization'] = `JWT ${token}`

      const response = await fetch(`/api/building-blocks/${blockToDelete.id}`, {
        method: 'DELETE',
        headers,
      })
      if (response.ok) {
        setBlocks(prev => prev.filter(b => b.id !== blockToDelete.id))
      }
    } catch (err) {
      console.error('Failed to delete building block:', err)
    } finally {
      setIsDeleting(false)
      setBlockToDelete(null)
    }
  }

  const columns: TableColumn<BuildingBlock>[] = [
    {
      key: 'name',
      label: 'Building Block',
      span: 4,
      renderCell: (block) => {
        const firstLetter = block.name ? block.name.charAt(0).toUpperCase() : 'B'
        return (
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              {firstLetter}
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {block.name}
              </span>
              <span className="block font-body text-xs text-outline mt-1 max-w-[280px] truncate leading-normal">
                Category: {block.category.charAt(0).toUpperCase() + block.category.slice(1)}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'slug',
      label: 'Identifier Slug',
      span: 3,
      renderCell: (block) => {
        return (
          <div className="flex items-center gap-1.5 max-w-full">
            <span className="font-mono text-xs text-on-surface bg-surface-container px-2 py-1 rounded select-all truncate">
              {block.slug}
            </span>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Registry Status',
      span: 2,
      renderCell: (block) => {
        const isDeprecated = block.status === 'deprecated'
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Status</span>
            <Badge color={isDeprecated ? 'danger' : 'success'} size="md">
              {block.status === 'deprecated' ? 'Deprecated' : 'Active'}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      span: 2,
      renderCell: (block) => {
        const dateStr = new Date(block.updatedAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
        return (
          <div className="flex lg:block items-center justify-between text-xs text-outline font-body">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Last Updated</span>
            <span>{dateStr}</span>
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 1,
      headerClassName: 'text-right pr-2',
      renderCell: (block) => {
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(block.id, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {activeMenuId === block.id && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/building-blocks/${block.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="edit" size={14} />
                  Edit Block
                </button>
                <button
                  type="button"
                  onClick={(e) => triggerDelete(block, e)}
                  className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-error hover:bg-error/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="delete" size={14} className="text-error" />
                  Delete Block
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
        <Icon name="widgets" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Building Blocks Found</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {searchQuery || activeCategory !== 'all'
          ? 'No building blocks fit the active filters or search parameters. Refine your query.'
          : 'Define visual building blocks to establish consistent visual foundations.'}
      </p>
      {(searchQuery || activeCategory !== 'all') && (
        <button
          type="button"
          onClick={() => { setSearchQuery(''); setActiveCategory('all') }}
          className="mt-4 border border-outline-variant/15 text-primary hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  if (error) {
    return (
      <div className="custom-building-block-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background flex flex-col items-center justify-center">
        <Icon name="error" className="text-error mb-4" size={48} />
        <h2 className="font-headline text-2xl font-bold text-on-surface">System Failure</h2>
        <p className="font-body text-on-surface-variant mt-2">{error}</p>
        <button 
          onClick={() => fetchBlocks()}
          className="mt-6 px-6 py-2 bg-primary text-on-primary rounded-lg font-label font-semibold border-none cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="custom-building-block-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Reusable Editorial Header */}
      <RegistryHeader
        title="Building Blocks"
        subtitle="Manage and construct reusable structural elements. These foundational components form the architectural basis of your editorial templates."
        breadcrumbs={[BRANDING.appName, 'Building Blocks']}
        showAction={true}
        actionText="Create Block"
        actionIcon="add"
        onActionClick={() => router.push('/admin/collections/building-blocks/create')}
      />

      {/* Control Bar: Filter Chips & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mt-8 gap-4">
        <FilterChips
          options={CATEGORIES}
          selectedValue={activeCategory}
          onChange={setActiveCategory}
        />

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search blueprints..."
        />
      </div>

      {/* Reusable Listing Table */}
      <RegistryTable
        columns={columns}
        items={paginatedBlocks}
        loading={isLoading}
        skeletonCount={limit}
        onRowClick={(block) => router.push(`/admin/collections/building-blocks/${block.id}`)}
        emptyState={emptyState}
      />

      {/* Reusable Pagination */}
      <RegistryPagination
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalDocs={totalDocs}
        onPageChange={setPage}
        loading={isLoading}
      />

      {/* Reusable Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!blockToDelete}
        title="Delete Building Block?"
        content={<p className="m-0 leading-relaxed font-body">Are you sure you want to delete this building block? This action is permanent and cannot be undone.</p>}
        confirmText="Delete"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setBlockToDelete(null)}
        type="danger"
      />

    </div>
  )
}
