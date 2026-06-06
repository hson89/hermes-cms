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

interface UserTenant {
  tenant: string | { id: string; name: string }
  id?: string | null
}

interface User {
  id: string
  name: string
  email: string
  role: 'super-admin' | 'tenant-admin' | 'editor'
  tenants?: UserTenant[]
  createdAt: string
  updatedAt: string
}

export const UserListPage: React.FC = () => {
  const router = useRouter()
  const { user: currentUser } = useAuth()

  // API List States
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Search & Filter States
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'super-admin' | 'tenant-admin' | 'editor'>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
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
  const handleRoleFilterChange = (role: 'all' | 'super-admin' | 'tenant-admin' | 'editor') => {
    setRoleFilter(role)
    setPage(1)
  }

  // Live Fetch registry
  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      let url = `/api/users?limit=${limit}&page=${page}&sort=-createdAt`

      // Build standard Payload REST API filters
      const filterParts: string[] = []

      if (roleFilter !== 'all') {
        filterParts.push(`where[role][equals]=${roleFilter}`)
      }

      if (debouncedSearch.trim()) {
        const query = encodeURIComponent(debouncedSearch.trim())
        // Search by name OR email
        filterParts.push(`where[or][0][name][like]=${query}&where[or][1][email][like]=${query}`)
      }

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to retrieve user accounts registry.')
      
      const data = await res.json()
      setUsers(data.docs || [])
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred while loading users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, debouncedSearch, roleFilter])

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
  const triggerDelete = (user: User, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuId(null)
    if (currentUser && currentUser.id === user.id) {
      setError('You cannot delete your own active administrator account.')
      setTimeout(() => setError(''), 3000)
      return
    }
    setUserToDelete(user)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to delete the user account.')
      }

      setSuccess(`User account for "${userToDelete.name}" was successfully decommissioned.`)
      setUserToDelete(null)
      setTimeout(() => setSuccess(''), 3000)
      
      // Reload listing
      if (users.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        fetchUsers()
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to decommission user account.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Styling maps based on Alexandria theme & Public Sans metrics
  const roleBadges: Record<User['role'], { text: string; icon: string; color: 'gold' | 'primary' | 'neutral' }> = {
    'super-admin': {
      text: 'Super Admin',
      icon: 'shield_person',
      color: 'gold'
    },
    'tenant-admin': {
      text: 'Tenant Admin',
      icon: 'admin_panel_settings',
      color: 'primary'
    },
    editor: {
      text: 'Editor',
      icon: 'edit_square',
      color: 'neutral'
    }
  }

  const filterOptions: FilterOption<'all' | 'super-admin' | 'tenant-admin' | 'editor'>[] = [
    { value: 'all', label: 'All Users' },
    { value: 'super-admin', label: 'Super Admins' },
    { value: 'tenant-admin', label: 'Tenant Admins' },
    { value: 'editor', label: 'Editors' },
  ]

  const columns: TableColumn<User>[] = [
    {
      key: 'identity',
      label: 'User Identity',
      span: 4,
      renderCell: (user) => {
        const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')
        return (
          <div className="flex items-center gap-3.5">
            {/* Upper decorative monogram avatar */}
            <div className="size-10 rounded-full bg-primary/5 text-primary flex items-center justify-center flex-shrink-0 font-label font-bold text-base transition-colors group-hover:bg-primary group-hover:text-on-primary">
              {firstLetter}
            </div>
            <div>
              <span className="block font-headline font-bold text-base text-on-surface leading-tight transition-colors group-hover:text-primary">
                {user.name || 'Anonymous User'}
              </span>
              <span className="block font-mono text-[10px] text-outline mt-0.5 max-w-[240px] truncate">
                {user.email}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'role',
      label: 'System Role',
      span: 2,
      renderCell: (user) => {
        const roleConf = roleBadges[user.role] || roleBadges.editor
        return (
          <div className="flex lg:block items-center justify-between">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">User Role</span>
            <Badge color={roleConf.color} icon={roleConf.icon} size="md">
              {roleConf.text}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'tenants',
      label: 'Affiliated Tenants',
      span: 5,
      renderCell: (user) => {
        const tenantItems = user.tenants || []
        
        return (
          <div className="flex flex-col lg:block items-start gap-1">
            <span className="lg:hidden text-[9px] text-outline uppercase font-label font-bold tracking-wider">Affiliated Tenants</span>
            {tenantItems.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-w-full">
                {tenantItems.map((item, idx) => {
                  const name = typeof item.tenant === 'object' && item.tenant !== null 
                    ? item.tenant.name 
                    : `Tenant #${item.tenant}`
                  return (
                    <Badge 
                      key={idx}
                      color="primary"
                      size="sm"
                    >
                      {name}
                    </Badge>
                  )
                })}
              </div>
            ) : user.role === 'super-admin' ? (
              <Badge color="gold" size="sm">
                Global Bypass (All Tenants)
              </Badge>
            ) : (
              <span className="text-outline text-xs italic font-body">No tenants scoped</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 1,
      headerClassName: 'text-right pr-2',
      renderCell: (user) => {
        return (
          <div className="flex lg:justify-end items-center justify-end">
            <button
              type="button"
              onClick={(e) => toggleMenu(user.id, e)}
              className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
            >
              <Icon name="more_vert" size={18} />
            </button>

            {/* Premium Contextual Action Dropdown (Glassmorphism layout) */}
            {activeMenuId === user.id && (
              <div 
                className="absolute right-6 top-12 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/admin/collections/users/${user.id}`)}
                  className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="edit" size={14} />
                  Edit Settings
                </button>

                <button
                  type="button"
                  disabled={currentUser?.id === user.id}
                  onClick={(e) => triggerDelete(user, e)}
                  className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-error hover:bg-error/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                >
                  <Icon name="delete" size={14} className="text-error" />
                  Delete Account
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
        <Icon name="person" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Users Registered</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || roleFilter !== 'all' 
          ? 'No user accounts fit the active filters or search parameters. Refine your query.' 
          : 'Scale your editorial workflow and identity policies by creating a user account.'}
      </p>
      {(debouncedSearch || roleFilter !== 'all') && (
        <button
          type="button"
          onClick={() => { setSearch(''); setRoleFilter('all') }}
          className="mt-4 border border-outline-variant/15 text-primary hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  const deleteContent = userToDelete ? (
    <div className="space-y-2">
      <p>
        Are you absolutely sure you want to delete the user account for <span className="font-bold text-on-surface">{userToDelete.name || userToDelete.email}</span>?
      </p>
      <p>
        This action is non-reversible and will permanently revoke all access permissions, API access keys, and associated workspace credentials under this identity.
      </p>
    </div>
  ) : null

  return (
    <div className="custom-tenant-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Reusable Editorial Header */}
      <RegistryHeader
        title="Users Registry"
        subtitle="Manage and govern user credentials, assign granular role access policies, verify logical workspace isolation, and secure team workflows."
        breadcrumbs={[BRANDING.appName, 'Identity Registry']}
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
          selectedValue={roleFilter}
          onChange={handleRoleFilterChange}
        />

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
        />
      </div>

      {/* Reusable Listing Table */}
      <RegistryTable
        columns={columns}
        items={users}
        loading={loading}
        skeletonCount={limit}
        onRowClick={(user) => router.push(`/admin/collections/users/${user.id}`)}
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
        isOpen={!!userToDelete}
        title="Delete User Account?"
        content={deleteContent}
        confirmText="Delete Account"
        isConfirming={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setUserToDelete(null)}
        type="danger"
      />

    </div>
  )
}
