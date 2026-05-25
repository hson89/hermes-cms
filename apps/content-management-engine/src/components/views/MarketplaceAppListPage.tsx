"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'
import { BRANDING } from '@/constants/branding'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { RegistryTable, TableColumn } from '@/components/ui/organisms/RegistryTable'
import { RegistryPagination } from '@/components/ui/molecules/RegistryPagination'
import { ConfirmationModal } from '@/components/ui/organisms/ConfirmationModal'

interface MarketplaceApp {
  id: string
  name: string
  slug: string
  baseUrl: string
  description?: string
  icon?: any
  createdAt: string
  updatedAt: string
}

export const MarketplaceAppListPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()

  // API List States
  const [apps, setApps] = useState<MarketplaceApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [appToDelete, setAppToDelete] = useState<MarketplaceApp | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  // Live Fetch registry
  const fetchApps = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/marketplace-apps?limit=${limit}&page=${page}&sort=-createdAt`

      if (debouncedSearch.trim()) {
        url += `&where[name][like]=${encodeURIComponent(debouncedSearch.trim())}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve marketplace apps registry.')
      
      const data = await res.json()
      setApps(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading marketplace apps.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApps()
  }, [page, debouncedSearch])

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

  // Deletion logic
  const triggerDelete = (app: MarketplaceApp, e: React.MouseEvent) => {
    e.stopPropagation()
    setAppToDelete(app)
    setActiveMenuId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!appToDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/marketplace-apps/${appToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to delete the app.')
      }

      setSuccess(`App "${appToDelete.name}" was successfully removed.`)
      setAppToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      if (apps.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        fetchApps()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to delete marketplace app.')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: TableColumn<MarketplaceApp>[] = [
    {
      key: 'name',
      label: 'Application',
      span: 4,
      renderCell: (app) => {
        const iconUrl = typeof app.icon === 'object' ? app.icon?.url : null
        return (
          <div className="flex items-center gap-3.5">
            {iconUrl ? (
              <img 
                src={iconUrl} 
                alt={app.name} 
                className="size-10 rounded-xl object-cover border border-outline-variant/15" 
              />
            ) : (
              <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
                {app.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {app.name}
              </span>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-outline mt-1 font-body">
                <span className="font-mono text-[10px]">{app.slug}</span>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'baseUrl',
      label: 'Service Endpoint',
      span: 4,
      renderCell: (app) => (
        <div className="flex flex-col lg:block items-start gap-1">
          <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Base URL</span>
          <span className="font-mono text-xs text-on-surface truncate block max-w-full">
            {app.baseUrl}
          </span>
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description',
      span: 3,
      renderCell: (app) => (
        <div className="flex flex-col lg:block items-start gap-1">
          <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Details</span>
          <span className="text-xs text-on-surface-variant truncate block max-w-full font-body">
            {app.description || 'No description provided.'}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 1,
      headerClassName: 'text-right pr-2',
      renderCell: (app) => {
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(app.id, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {activeMenuId === app.id && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/marketplace-apps/${app.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="edit" size={14} />
                  Edit App
                </button>
                
                {(user as any)?.role === 'super-admin' && (
                  <button
                    type="button"
                    onClick={(e) => triggerDelete(app, e)}
                    className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-red-600 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                  >
                    <Icon name="delete" size={14} className="text-red-500" />
                    Delete App
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
        <Icon name="shopping_bag" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Apps in Marketplace</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch 
          ? 'No apps fit the search parameters. Refine your query.' 
          : 'The marketplace global directory is currently empty.'}
      </p>
      {debouncedSearch && (
        <button
          type="button"
          onClick={() => setSearch('')}
          className="mt-4 border border-outline-variant/15 text-primary hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          Clear Search
        </button>
      )}
    </div>
  )

  const deleteContent = appToDelete ? (
    <div className="space-y-2">
      <p>
        Are you sure you want to remove <span className="font-bold text-on-surface">{appToDelete.name}</span> from the marketplace?
      </p>
      <p>
        This will not uninstall the app from existing tenants, but it will prevent new installations.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-marketplace-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      <RegistryHeader
        title="App Marketplace"
        subtitle="Browse and govern the global directory of 3rd-party integrations available for tenant installation. Manage service endpoints and app metadata."
        breadcrumbs={[BRANDING.appName, 'Marketplace Registry']}
        showAction={false}
      />

      {success && (
        <div className="mt-6 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-500/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-green-600" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-500/20 animate-fade-slide-up">
          <Icon name="error" className="text-red-500" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-end items-stretch lg:items-center mt-8 gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search apps by name..."
        />
      </div>

      <RegistryTable
        columns={columns}
        items={apps}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(app) => router.push(`/admin/collections/marketplace-apps/${app.id}`)}
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
        isOpen={!!appToDelete}
        title="Remove App from Marketplace?"
        content={deleteContent}
        confirmText="Remove App"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setAppToDelete(null)}
        type="danger"
      />

    </div>
  )
}
