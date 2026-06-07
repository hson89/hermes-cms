"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'
import { BRANDING } from '@/constants/branding'
import { RegistryTable, TableColumn } from '@/components/ui/organisms/RegistryTable'
import { RegistryPagination } from '@/components/ui/molecules/RegistryPagination'
import { Badge } from '@/components/ui/atoms/Badge'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { FilterChips, FilterOption } from '@/components/ui/molecules/FilterChips'
import { AdminView } from '@/components/admin/AdminView'
import { HostedSite, Tenant } from '@/payload-types'
import { getStatusBadgeColor } from './TemplateHistoryPage/utils'

// Temporary local type fallbacks for out-of-sync payload-types.ts
// To be removed once pnpm payload generate:types is successful.
export interface PageTemplate {
  id: string
  name: string
  slug: string
}

export interface TemplateDeployment {
  id: string
  template: string | PageTemplate
  site: string | HostedSite
  status: 'pending' | 'success' | 'failed'
  tenant: string | Tenant
  createdAt: string
  updatedAt: string
}

export const TemplateHistoryPage: React.FC = () => {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // API List States
  const [deployments, setDeployments] = useState<TemplateDeployment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const handleStatusFilterChange = (status: 'all' | 'pending' | 'success' | 'failed') => {
    setStatusFilter(status)
    setPage(1)
  }

  // Fetch deployments from REST API
  const fetchDeployments = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/template-deployments?limit=${limit}&page=${page}&sort=-createdAt&depth=1`
      
      const filterParts: string[] = []
      if (statusFilter !== 'all') {
        filterParts.push(`where[status][equals]=${statusFilter}`)
      }
      if (debouncedSearch.trim()) {
        const query = encodeURIComponent(debouncedSearch.trim())
        // Searching by template name
        filterParts.push(`where[template.name][like]=${query}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve deployment history.')
      
      const data = await res.json()
      setDeployments(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading deployment history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeployments()
  }, [page, debouncedSearch, statusFilter])

  const filterOptions: FilterOption<'all' | 'pending' | 'success' | 'failed'>[] = [
    { value: 'all', label: 'All Events' },
    { value: 'pending', label: 'Pending' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
  ]

  const columns: TableColumn<TemplateDeployment>[] = [
    {
      key: 'template',
      label: 'Template',
      span: 4,
      renderCell: (item) => {
        const template = item.template as PageTemplate
        const templateName = typeof template === 'object' ? template.name : 'Unknown Template'
        const firstLetter = templateName.charAt(0).toUpperCase()
        
        return (
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base">
              {firstLetter}
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight">
                {templateName}
              </span>
              <span className="block font-mono text-[10px] text-outline mt-0.5">
                ID: {item.id}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'site',
      label: 'Hosted Site',
      span: 3,
      renderCell: (item) => {
        const site = item.site as HostedSite
        const siteName = typeof site === 'object' ? site.name : 'Unknown Site'
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Hosted Site</span>
            <Badge color="neutral" size="md" icon="web">
              {siteName}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      span: 2,
      renderCell: (item) => {
        const status = item.status
        const badgeColor = getStatusBadgeColor(status)

        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Status</span>
            <Badge color={badgeColor} size="md">
              {status}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'date',
      label: 'Deployment Date',
      span: 3,
      renderCell: (item) => {
        const date = new Date(item.createdAt)
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Deployment Date</span>
            <span className="text-sm text-on-surface-variant font-medium">
              {date.toLocaleDateString()}
            </span>
            <span className="block text-[10px] text-outline">
              {date.toLocaleTimeString()}
            </span>
          </div>
        )
      }
    }
  ]

  const emptyState = (
    <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/15 flex flex-col items-center justify-center">
      <div className="size-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 text-outline-variant">
        <Icon name="history" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Deployment History</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        Deployment logs will appear here once you publish templates to your hosted sites.
      </p>
    </div>
  )

  return (
    <AdminView>
      <div className="custom-history-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
        <RegistryHeader
          title="Deployment History"
          subtitle="Audit and track template publishing events across your multi-tenant hosted sites."
          breadcrumbs={[BRANDING.appName, 'Deployment History']}
          showAction={false}
        />

        {error && (
          <div className="mt-6 p-4 bg-error/10 text-error rounded-xl flex items-center gap-3 border border-error/20">
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
            placeholder="Search by template name..."
          />
        </div>

        <div className="mt-8">
          <RegistryTable
            columns={columns}
            items={deployments}
            loading={loading}
            skeletonCount={limit}
            emptyState={emptyState}
          />
        </div>

        <RegistryPagination
          page={page}
          limit={limit}
          totalPages={totalPages}
          totalDocs={totalDocs}
          onPageChange={setPage}
          loading={loading}
        />
      </div>
    </AdminView>
  )
}
