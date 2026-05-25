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

interface TenantApp {
  id: string
  app: {
    id: string
    name: string
    slug: string
  } | string
  tenant: {
    id: string
    name: string
  } | string
  status: 'active' | 'inactive'
  installedAt: string
  createdAt: string
  updatedAt: string
}

export const TenantAppListPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()

  // API List States
  const [tenantApps, setTenantApps] = useState<TenantApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [appToUninstall, setAppToDelete] = useState<TenantApp | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Live Fetch registry
  const fetchTenantApps = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/tenant-apps?limit=${limit}&page=${page}&sort=-installedAt&depth=1`

      const filterParts: string[] = []
      if (statusFilter !== 'all') {
        filterParts.push(`where[status][equals]=${statusFilter}`)
      }

      if (debouncedSearch.trim()) {
        // Search by app name (relationship)
        filterParts.push(`where[app.name][like]=${encodeURIComponent(debouncedSearch.trim())}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve installed apps registry.')
      
      const data = await res.json()
      setTenantApps(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading installed apps.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenantApps()
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

  const triggerUninstall = (app: TenantApp, e: React.MouseEvent) => {
    e.stopPropagation()
    setAppToDelete(app)
    setActiveMenuId(null)
  }

  const handleUninstallConfirm = async () => {
    if (!appToUninstall) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/tenant-apps/${appToUninstall.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to uninstall the app.')
      }

      const appName = typeof appToUninstall.app === 'object' ? appToUninstall.app.name : 'Application'
      setSuccess(`App "${appName}" was successfully uninstalled.`)
      setAppToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      if (tenantApps.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        fetchTenantApps()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to uninstall app.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filterOptions: FilterOption<'all' | 'active' | 'inactive'>[] = [
    { value: 'all', label: 'All Installations' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]

  const columns: TableColumn<TenantApp>[] = [
    {
      key: 'app',
      label: 'Installed Application',
      span: 4,
      renderCell: (item) => {
        const appName = typeof item.app === 'object' ? item.app.name : 'Unknown App'
        const appSlug = typeof item.app === 'object' ? item.app.slug : ''
        return (
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              <Icon name="extension" size={20} />
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {appName}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-outline mt-1 font-mono uppercase tracking-tighter">
                {appSlug}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'tenant',
      label: 'Tenant Workspace',
      span: 3,
      renderCell: (item) => {
        const tenantName = typeof item.tenant === 'object' ? item.tenant.name : 'Unknown Tenant'
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Tenant</span>
            <span className="font-label text-xs font-bold text-on-surface truncate block max-w-full">
              {tenantName}
            </span>
          </div>
        )
      }
    },
    {
      key: 'installedAt',
      label: 'Installation Date',
      span: 2,
      renderCell: (item) => (
        <div className="flex flex-col lg:block items-start gap-1">
          <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Installed On</span>
          <span className="text-xs text-on-surface-variant font-body">
            {new Date(item.installedAt || item.createdAt).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      span: 2,
      renderCell: (item) => (
        <div className="flex lg:block items-center justify-between">
          <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">State</span>
          <Badge color={item.status === 'active' ? 'success' : 'neutral'} size="md">
            {item.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 1,
      headerClassName: 'text-right pr-2',
      renderCell: (item) => {
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(item.id, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {activeMenuId === item.id && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/tenant-apps/${item.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="settings" size={14} />
                  Manage App
                </button>
                
                <button
                  type="button"
                  onClick={(e) => triggerUninstall(item, e)}
                  className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-red-600 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="delete" size={14} className="text-red-500" />
                  Uninstall App
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
        <Icon name="extension" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Apps Installed</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || statusFilter !== 'all' 
          ? 'No installations fit the active filters or search parameters.' 
          : 'You haven\'t installed any marketplace applications for your tenants yet.'}
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

  const uninstallContent = appToUninstall ? (
    <div className="space-y-2">
      <p>
        Are you sure you want to uninstall this application?
      </p>
      <p>
        This will revoke all active JWT connection tokens and clear the local configuration parameters for this installation.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-tenant-app-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      <RegistryHeader
        title="App Installations"
        subtitle="Manage 3rd-party integrations active within your tenant environments. Configure app parameters, generate secure connection tokens, and monitor installation health."
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

      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mt-8 gap-4">
        <FilterChips
          options={filterOptions}
          selectedValue={statusFilter}
          onChange={handleStatusFilterChange}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by app name..."
        />
      </div>

      <RegistryTable
        columns={columns}
        items={tenantApps}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(item) => router.push(`/admin/collections/tenant-apps/${item.id}`)}
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
        isOpen={!!appToUninstall}
        title="Uninstall Application?"
        content={uninstallContent}
        confirmText="Uninstall"
        isConfirming={isDeleting}
        onConfirm={handleUninstallConfirm}
        onCancel={() => setAppToDelete(null)}
        type="danger"
      />

    </div>
  )
}
