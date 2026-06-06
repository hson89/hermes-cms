"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDocumentInfo } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Button } from '@/components/ui/atoms/Button'
import { Label } from '@/components/ui/atoms/Label'
import { Card } from '@/components/ui/molecules/Card'
import { FormField } from '@/components/ui/molecules/FormField'
import { FormSelect } from '@/components/ui/molecules/FormSelect'
import { Badge } from '@/components/ui/atoms/Badge'
import { Tenant } from '@/payload-types'

export const CreateUserPage: React.FC = () => {
  const router = useRouter()
  const { id } = useDocumentInfo()
  const isEditMode = !!id

  // View States
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'super-admin' | 'tenant-admin' | 'editor'>('editor')
  const [password, setPassword] = useState('')
  const [changePassword, setChangePassword] = useState(false)

  // Tenants data and selected mappings
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [selectedTenantIds, setSelectedTenantIds] = useState<number[]>([])
  const [tenantSelectorValue, setTenantSelectorValue] = useState('')

  // Load available tenants from registry
  useEffect(() => {
    fetch('/api/tenants?limit=100')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load tenants registry')
        return res.json()
      })
      .then((data) => {
        if (data && data.docs) {
          setAllTenants(data.docs)
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Could not fetch active workspace registries.')
      })
  }, [])

  // Load existing user details under Edit Mode
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true)
      fetch(`/api/users/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load user')
          return res.json()
        })
        .then((data) => {
          if (data) {
            setName(data.name || '')
            setEmail(data.email || '')
            setRole(data.role || 'editor')
            
            // Extract tenant IDs
            const mappedIds = (data.tenants || []).map((t: any) => {
              if (t.tenant && typeof t.tenant === 'object' && t.tenant !== null) {
                return t.tenant.id
              }
              return t.tenant
            }).filter(Boolean) as number[]
            
            setSelectedTenantIds(mappedIds)
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Failed to fetch user credentials.')
        })
        .finally(() => setIsLoading(false))
    }
  }, [id, isEditMode])

  // Get Initials for Live Monogram
  const getInitials = () => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Handle adding workspace mapping
  const handleAddTenant = () => {
    if (!tenantSelectorValue) return
    const idNum = parseInt(tenantSelectorValue, 10)
    if (isNaN(idNum)) return

    if (selectedTenantIds.includes(idNum)) {
      setError('User is already associated with this workspace tenant.')
      return
    }

    setSelectedTenantIds([...selectedTenantIds, idNum])
    setTenantSelectorValue('')
    setError('')
  }

  // Handle removing workspace mapping
  const handleRemoveTenant = (tid: number) => {
    setSelectedTenantIds(selectedTenantIds.filter((id) => id !== tid))
  }

  // Submit Action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please enter a display name.')
      return
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!isEditMode && !password.trim()) {
      setError('Please set a password for the new user profile.')
      return
    }
    if (!isEditMode && password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }
    if (isEditMode && changePassword && !password.trim()) {
      setError('Please enter the new password.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const payloadData: Record<string, any> = {
      name,
      email,
      role,
      tenants: selectedTenantIds.map((tid) => ({ tenant: tid })),
    }

    // Set password if creating or updating with password-change toggled
    if (!isEditMode || changePassword) {
      payloadData.password = password
    }

    try {
      const url = isEditMode ? `/api/users/${id}` : '/api/users'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadData),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'An error occurred while saving user settings.')
      }

      setSuccess(isEditMode ? 'User credentials updated successfully!' : 'User created successfully!')
      
      setTimeout(() => {
        router.push('/admin/collections/users')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to submit user settings.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <span className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <Text variant="body" className="text-outline font-medium">Fetching user data from directory...</Text>
      </div>
    )
  }

  return (
    <div className="custom-user-view w-full max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-surface-bright min-h-[80vh] font-body text-on-surface antialiased">
      
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant/15 pb-6 mb-8 gap-4">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Identity &amp; Governance</span>
          <Heading level={2} className="mt-1">
            {isEditMode ? `Edit User: ${name}` : 'Create New User'}
          </Heading>
          <Text variant="small" className="mt-1 max-w-xl">
            {isEditMode 
              ? 'Modify admin roles, update password hashes, and adjust tenant workspaces mappings.'
              : 'Add administrative or tenant editorial accounts governed by multi-tenant access credentials.'}
          </Text>
        </div>
        
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/collections/users')}
          className="uppercase tracking-widest text-xs"
        >
          <Icon name="arrow_back" size={16} />
          Return to Registry
        </Button>
      </div>

      {/* Success Notification Banner */}
      {success && (
        <div className="mb-8 p-4 bg-success/10 text-success rounded-xl flex items-center gap-3 border border-success/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-success" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="mb-8 p-4 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 border border-error/15 animate-fade-slide-up">
          <Icon name="error" className="text-error" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Visual Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card variant="low" className="border border-outline-variant/15 p-6 relative overflow-hidden flex flex-col items-center text-center">
            {/* Elegant glass profile backgrounds */}
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-primary/30 to-primary-container/30 filter blur-xl -z-10" />
            
            {/* Dynamic Avatar Monogram */}
            <div className="size-20 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center font-headline font-bold text-3xl ring-4 ring-surface-container-low transition-all duration-300">
              {getInitials()}
            </div>

            <Heading level={4} className="mt-4 text-xl tracking-tight text-on-surface truncate w-full">
              {name || 'User Initials'}
            </Heading>
            <Text variant="small" className="text-outline font-medium text-xs truncate w-full mt-0.5">
              {email || 'no-email@hermes.ai'}
            </Text>

            {/* Role Badge */}
            <div className="mt-3">
              {role === 'super-admin' && <Badge className="bg-primary text-on-primary">Super Admin</Badge>}
              {role === 'tenant-admin' && <Badge className="bg-tertiary text-on-tertiary">Tenant Admin</Badge>}
              {role === 'editor' && <Badge className="bg-surface-container-highest text-outline">Editor</Badge>}
            </div>

            {/* Divider */}
            <div className="pt-6 mt-6 w-full" />

            {/* Mapped Workspaces list */}
            <div className="w-full text-left space-y-3">
              <span className="font-label text-[10px] uppercase tracking-widest text-outline block font-bold">Assigned Workspaces</span>
              {selectedTenantIds.length === 0 ? (
                <Text variant="small" className="text-outline italic text-xs">
                  No active workspaces bound to this user. User cannot log in until associated with a tenant.
                </Text>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {selectedTenantIds.map((tid) => {
                    const matched = allTenants.find((t) => t.id === tid)
                    return (
                      <span 
                        key={tid} 
                        className="inline-flex items-center rounded-lg bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface border border-outline-variant/15"
                      >
                        <Icon name="workspaces" size={12} className="text-primary mr-1 flex-shrink-0" />
                        {matched?.name || `Tenant ID: ${tid}`}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Edit form */}
        <div className="lg:col-span-8">
          <Card variant="low" className="border border-outline-variant/15 p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <Heading level={4} className="mb-1 text-xl">User Profile Credentials</Heading>
                <Text variant="small">Enter user identity data, access privileges, and workspace scopes.</Text>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField 
                  label="Display Name"
                  id="userName"
                  inputProps={{
                    value: name,
                    onChange: (e) => setName((e.target as HTMLInputElement).value)
                  }}
                  placeholder="e.g. Jean-Luc Picard"
                  required
                />

                <FormField 
                  label="Email Address"
                  id="userEmail"
                  type="email"
                  inputProps={{
                    value: email,
                    onChange: (e) => setEmail((e.target as HTMLInputElement).value)
                  }}
                  placeholder="e.g. jean-luc@starfleet.org"
                  required
                />
              </div>

              <FormSelect
                label="Administrative Role"
                id="userRole"
                selectProps={{
                  value: role,
                  onChange: (e) => setRole((e.target as HTMLSelectElement).value as 'super-admin' | 'tenant-admin' | 'editor')
                }}
              >
                <option value="editor">Editor (Access specific tenant content pools only)</option>
                <option value="tenant-admin">Tenant Admin (Full administration within associated tenants)</option>
                <option value="super-admin">Super Admin (Unrestricted global cms settings bypass)</option>
              </FormSelect>

              {/* Password credentials panel */}
              {isEditMode ? (
                <div className="space-y-4 border border-outline-variant/15 rounded-xl p-4 bg-surface-container-low/40">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="changePasswordCheckbox"
                      checked={changePassword}
                      onChange={(e) => setChangePassword(e.target.checked)}
                      className="size-4 text-primary bg-surface-container-lowest border-outline-variant/15 rounded focus:ring-primary cursor-pointer"
                    />
                    <label 
                      htmlFor="changePasswordCheckbox"
                      className="font-body text-sm font-semibold text-on-surface cursor-pointer select-none"
                    >
                      Update Password Credentials
                    </label>
                  </div>
                  {changePassword && (
                    <FormField 
                      label="New Password"
                      id="userPassword"
                      type="password"
                      inputProps={{
                        value: password,
                        onChange: (e) => setPassword((e.target as HTMLInputElement).value),
                        required: changePassword
                      }}
                      placeholder="Minimum 8 characters"
                    />
                  )}
                </div>
              ) : (
                <FormField 
                  label="Password"
                  id="userPassword"
                  type="password"
                  inputProps={{
                    value: password,
                    onChange: (e) => setPassword((e.target as HTMLInputElement).value),
                    required: true
                  }}
                  placeholder="Minimum 8 characters"
                />
              )}

              {/* Tenant boundaries list lookup */}
              <div className="space-y-3">
                <Label>Workspace Association Scope</Label>
                <div className="flex gap-2">
                  <FormSelect
                    label=""
                    id="tenantSelector"
                    className="flex-1 space-y-0"
                    selectProps={{
                      value: tenantSelectorValue,
                      onChange: (e) => setTenantSelectorValue(e.target.value)
                    }}
                  >
                    <option value="">Select a workspace tenant to add...</option>
                    {allTenants
                      .filter((t) => !selectedTenantIds.includes(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.slug})
                        </option>
                      ))}
                  </FormSelect>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddTenant}
                    className="font-label font-bold text-xs uppercase tracking-widest px-5 rounded-xl transition-all flex items-center gap-1.5 py-3.5"
                  >
                    <Icon name="add" size={16} />
                    Map
                  </Button>
                </div>

                {/* Display active mappings list with deletion hooks */}
                <div className="space-y-2 mt-2">
                  {selectedTenantIds.map((tid) => {
                    const matched = allTenants.find((t) => t.id === tid)
                    return (
                      <div 
                        key={tid} 
                        className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/15 bg-surface-container-low font-body text-sm font-semibold transition-all text-on-surface"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="workspaces" size={16} className="text-primary" />
                          <span>{matched?.name || `Tenant ID: ${tid}`}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTenant(tid)}
                          className="text-outline-variant hover:text-error hover:bg-error/10 p-1.5 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        >
                          <Icon name="close" size={16} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Form actions */}
              <div className="pt-6 border-t border-outline-variant/15 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/admin/collections/users')}
                  className="uppercase tracking-widest text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save User Profile'}
                </Button>
              </div>

            </form>
          </Card>
        </div>

      </div>

    </div>
  )
}
