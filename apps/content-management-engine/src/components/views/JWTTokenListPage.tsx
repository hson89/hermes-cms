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
import { Badge } from '@/components/ui/atoms/Badge'

interface JWTToken {
  id: string
  tokenHash: string
  tenant: { id: string; name: string } | string
  appId: { id: string; name: string } | string
  expiresAt: string
  isRevoked: boolean
  createdAt: string
}

export const JWTTokenListPage: React.FC = () => {
  const router = useRouter()

  const [tokens, setTokens] = useState<JWTToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [revocationFilter, setRevocationFilter] = useState<'all' | 'active' | 'revoked'>('all')

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const fetchTokens = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/jwt-tokens?limit=${limit}&page=${page}&sort=-createdAt&depth=1`
      const filterParts: string[] = []

      if (revocationFilter === 'active') {
        filterParts.push(`where[isRevoked][equals]=false`)
      } else if (revocationFilter === 'revoked') {
        filterParts.push(`where[isRevoked][equals]=true`)
      }

      if (debouncedSearch.trim()) {
        filterParts.push(`where[tokenHash][like]=${encodeURIComponent(debouncedSearch.trim())}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve token registry.')
      const data = await res.json()
      setTokens(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      setError(err.message || 'Error loading tokens.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [page, debouncedSearch, revocationFilter])

  const columns: TableColumn<JWTToken>[] = [
    {
      key: 'tokenHash',
      label: 'Token Fingerprint',
      span: 4,
      renderCell: (item) => (
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-surface-container flex items-center justify-center text-outline-variant">
            <Icon name="fingerprint" size={18} />
          </div>
          <span className="font-mono text-[10px] text-on-surface truncate max-w-[200px]">
            {item.tokenHash}
          </span>
        </div>
      )
    },
    {
      key: 'appId',
      label: 'Application',
      span: 3,
      renderCell: (item) => {
        const appName = typeof item.appId === 'object' ? item.appId.name : 'Unknown'
        return <span className="font-label text-xs font-bold text-on-surface">{appName}</span>
      }
    },
    {
      key: 'tenant',
      label: 'Tenant',
      span: 2,
      renderCell: (item) => {
        const tenantName = typeof item.tenant === 'object' ? item.tenant.name : 'Unknown'
        return <span className="text-xs text-on-surface-variant font-body">{tenantName}</span>
      }
    },
    {
      key: 'status',
      label: 'Status',
      span: 2,
      renderCell: (item) => {
        const isExpired = new Date(item.expiresAt) < new Date()
        if (item.isRevoked) return <Badge color="danger" size="sm">Revoked</Badge>
        if (isExpired) return <Badge color="neutral" size="sm">Expired</Badge>
        return <Badge color="success" size="sm">Active</Badge>
      }
    },
    {
      key: 'expiresAt',
      label: 'Expiry',
      span: 1,
      renderCell: (item) => (
        <span className="text-[10px] text-outline font-mono">
          {new Date(item.expiresAt).toLocaleDateString()}
        </span>
      )
    }
  ]

  const filterOptions: FilterOption<'all' | 'active' | 'revoked'>[] = [
    { value: 'all', label: 'All Tokens' },
    { value: 'active', label: 'Active Only' },
    { value: 'revoked', label: 'Revoked' },
  ]

  return (
    <div className="custom-jwt-view w-full max-w-[1600px] mx-auto px-6 py-8 bg-background min-h-screen font-body text-on-background antialiased">
      <RegistryHeader
        title="Token Registry"
        subtitle="Audit and manage cryptographic marketplace connection tokens. Monitor expiration dates and enforce immediate revocations."
        breadcrumbs={['Hermes AI', 'Security Audit']}
      />

      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mt-8 gap-4">
        <FilterChips
          options={filterOptions}
          selectedValue={revocationFilter}
          onChange={setRevocationFilter}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by hash..."
        />
      </div>

      <RegistryTable
        columns={columns}
        items={tokens}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(item) => router.push(`/admin/collections/jwt-tokens/${item.id}`)}
      />

      <RegistryPagination
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalDocs={totalDocs}
        onPageChange={setPage}
        loading={loading}
      />
    </div>
  )
}
