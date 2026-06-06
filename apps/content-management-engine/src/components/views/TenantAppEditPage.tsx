"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDocumentInfo, useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Button } from '@/components/ui/atoms/Button'
import { Card } from '@/components/ui/molecules/Card'
import { FormSelect } from '@/components/ui/molecules/FormSelect'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'
import { BRANDING } from '@/constants/branding'
import { GenerateTokenButton } from '@/components/admin/GenerateTokenButton'

interface MarketplaceApp {
  id: string
  name: string
}

interface Tenant {
  id: string
  name: string
}

/**
 * TenantAppEditPage component.
 * Specialized multi-tenant console for managing specific app installations.
 * Follows Alexandria design system.
 */
export const TenantAppEditPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { id } = useDocumentInfo()
  const isEditMode = !!id

  // View States
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [appId, setAppId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [status, setStatus] = useState('active')
  const [config, setConfig] = useState('{}')

  // Options for relationships
  const [apps, setApps] = useState<MarketplaceApp[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])

  // Load available apps and tenants
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, tenantsRes] = await Promise.all([
          fetch('/api/marketplace-apps?limit=1000'),
          fetch('/api/tenants?limit=1000')
        ])
        const appsData = await appsRes.json()
        const tenantsData = await tenantsRes.json()
        setApps(appsData.docs || [])
        setTenants(tenantsData.docs || [])
      } catch (err) {
        console.error('Failed to load relationship options:', err)
      }
    }
    fetchData()
  }, [])

  // Load existing installation if in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true)
      fetch(`/api/tenant-apps/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load installation')
          return res.json()
        })
        .then((data) => {
          if (data) {
            setAppId(typeof data.app === 'object' ? data.app.id : data.app || '')
            setTenantId(typeof data.tenant === 'object' ? data.tenant.id : data.tenant || '')
            setStatus(data.status || 'active')
            setConfig(JSON.stringify(data.config || {}, null, 2))
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Failed to load installation details.')
        })
        .finally(() => setIsLoading(false))
    }
  }, [id, isEditMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!appId || !tenantId) {
      setError('Please select both an application and a tenant.')
      return
    }

    let parsedConfig = {}
    try {
      parsedConfig = JSON.parse(config)
    } catch (err) {
      setError('Invalid JSON format in setup parameters.')
      return
    }

    setIsSubmitting(true)
    setError('')

    // Convert IDs to numbers if they are numeric, as Payload with Postgres expects integer IDs.
    const finalAppId = isNaN(Number(appId)) ? appId : Number(appId)
    const finalTenantId = isNaN(Number(tenantId)) ? tenantId : Number(tenantId)

    const payloadData = {
      app: finalAppId,
      tenant: finalTenantId,
      status,
      config: parsedConfig,
    }

    try {
      const url = isEditMode ? `/api/tenant-apps/${id}` : '/api/tenant-apps'
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
        console.error('API Error details:', result)
        throw new Error(result.errors?.[0]?.message || result.message || 'An error occurred while saving the installation.')
      }

      setSuccess(isEditMode ? 'Installation updated successfully!' : 'App installed successfully!')
      
      setTimeout(() => {
        router.push('/admin/collections/tenant-apps')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to submit installation details.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <span className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <Text variant="body" className="text-outline font-medium">Fetching installation details...</Text>
      </div>
    )
  }

  return (
    <div className="custom-tenant-app-edit-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      <RegistryHeader
        title={isEditMode ? 'Manage Installation' : 'Install Application'}
        subtitle={isEditMode 
          ? 'Configure app-specific secrets, monitor status, and generate secure connection tokens for this integration.'
          : 'Provision a new 3rd-party integration for a specific tenant workspace organizational unit.'}
        breadcrumbs={[BRANDING.appName, 'Marketplace', 'App Console']}
        showAction={true}
        actionText="Return to List"
        actionIcon="arrow_back"
        onActionClick={() => router.push('/admin/collections/tenant-apps')}
      />

      {success && (
        <div className="mb-8 p-4 bg-success/10 text-success rounded-xl flex items-center gap-3 border border-success/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-success" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-error/10 text-error rounded-xl flex items-center gap-3 border border-error/20 animate-fade-slide-up">
          <Icon name="error" className="text-error" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
        <div className="lg:col-span-8">
          <Card variant="low" className="border border-outline-variant/15 p-6 lg:p-8 bg-surface-container-low/30 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-6">
                <div>
                  <Heading level={4} className="mb-1 text-xl">Deployment Parameters</Heading>
                  <Text variant="small">Define the target application and tenant workspace for this installation.</Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormSelect
                    label="Marketplace Application"
                    id="app"
                    selectProps={{
                      value: appId,
                      onChange: (e) => setAppId((e.target as HTMLSelectElement).value),
                      disabled: isEditMode
                    }}
                    required
                  >
                    <option value="">Choose an app...</option>
                    {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </FormSelect>

                  <FormSelect
                    label="Target Tenant Workspace"
                    id="tenant"
                    selectProps={{
                      value: tenantId,
                      onChange: (e) => setTenantId((e.target as HTMLSelectElement).value),
                      disabled: isEditMode
                    }}
                    required
                  >
                    <option value="">Choose a tenant...</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </FormSelect>
                </div>

                <FormSelect
                  label="Operational Status"
                  id="status"
                  selectProps={{
                    value: status,
                    onChange: (e) => setStatus((e.target as HTMLSelectElement).value)
                  }}
                >
                  <option value="active">Active (Production standard)</option>
                  <option value="inactive">Inactive (Disabled/Maintenance)</option>
                </FormSelect>

                <div className="space-y-2">
                  <label htmlFor="config" className="block font-label text-sm font-bold text-on-surface mb-1.5">
                    Setup Manifest (JSON)
                  </label>
                  <textarea
                    id="config"
                    value={config}
                    onChange={(e) => setConfig(e.target.value)}
                    placeholder="{}"
                    className="w-full min-h-[200px] p-4 bg-surface-container rounded-2xl border border-outline-variant/15 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono text-xs text-on-surface outline-none resize-none"
                  />
                  <Text variant="small" className="text-[10px] text-outline px-1">
                    Store integration keys, secrets, or environment overrides required by the 3rd-party application.
                  </Text>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-4 border-t border-outline-variant/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/admin/collections/tenant-apps')}
                  className="uppercase tracking-widest text-xs px-6"
                >
                  Discard Changes
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="uppercase tracking-widest text-xs px-8"
                >
                  {isSubmitting ? 'Processing...' : (isEditMode ? 'Save Settings' : 'Execute Installation')}
                </Button>
              </div>

            </form>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {isEditMode && <GenerateTokenButton tenantId={tenantId} appId={appId} />}
          
          <Card variant="low" className="p-6 border border-outline-variant/15 bg-surface-container-low/20 backdrop-blur-sm">
            <h4 className="font-headline text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
              <Icon name="verified_user" size={18} className="text-primary" />
              Security & Integrity
            </h4>
            <ul className="text-xs text-on-surface-variant space-y-4 list-none p-0 m-0">
              <li className="flex gap-3">
                <Icon name="lock" size={16} className="text-primary/60 shrink-0" />
                <span className="leading-relaxed">Access is strictly scoped to this tenant via cryptographic HS256 JWT tokens.</span>
              </li>
              <li className="flex gap-3">
                <Icon name="visibility" size={16} className="text-primary/60 shrink-0" />
                <span className="leading-relaxed">All outbound calls are audited and logged for compliance and security monitoring.</span>
              </li>
              <li className="flex gap-3">
                <Icon name="settings_input_component" size={16} className="text-primary/60 shrink-0" />
                <span className="leading-relaxed">Automated circuit breakers prevent 3rd-party script failures from affecting the CMS shell.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

    </div>
  )
}
