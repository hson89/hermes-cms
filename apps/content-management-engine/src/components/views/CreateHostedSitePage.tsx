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

interface Tenant {
  id: string
  name: string
  slug: string
}

export const CreateHostedSitePage: React.FC = () => {
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
  const [template, setTemplate] = useState<'nextjs-blog' | 'astro-portfolio'>('nextjs-blog')
  const [domain, setDomain] = useState('')
  const [status, setStatus] = useState('pending')
  const [deployedUrl, setDeployedUrl] = useState('')
  
  // Tenant relationship
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')

  // Load available tenants
  useEffect(() => {
    fetch('/api/tenants?limit=100')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load tenants')
        return res.json()
      })
      .then((data) => {
        if (data && data.docs) {
          setTenants(data.docs)
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Could not fetch active workspace registries.')
      })
  }, [])

  // Load existing site details
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true)
      fetch(`/api/hosted-sites/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load site')
          return res.json()
        })
        .then((data) => {
          if (data) {
            setName(data.name || '')
            setTemplate(data.template || 'nextjs-blog')
            setDomain(data.domain || '')
            setStatus(data.status || 'pending')
            setDeployedUrl(data.deployedUrl || '')
            
            const tid = typeof data.tenant === 'object' ? data.tenant.id : data.tenant
            setSelectedTenantId(tid ? tid.toString() : '')
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Failed to fetch site details.')
        })
        .finally(() => setIsLoading(false))
    }
  }, [id, isEditMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Please enter a site name.')
      return
    }
    if (!selectedTenantId) {
      setError('Please associate this site with a tenant workspace.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const payloadData = {
      name,
      template,
      domain,
      tenant: parseInt(selectedTenantId, 10),
    }

    try {
      const url = isEditMode ? `/api/hosted-sites/${id}` : '/api/hosted-sites'
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
        throw new Error(result.errors?.[0]?.message || result.message || 'An error occurred while saving the site.')
      }

      setSuccess(isEditMode ? 'Site settings updated successfully!' : 'Site provisioned successfully!')
      
      setTimeout(() => {
        router.push('/admin/collections/hosted-sites')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to submit site settings.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <span className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <Text variant="body" className="text-outline font-medium">Fetching site data...</Text>
      </div>
    )
  }

  return (
    <div className="custom-site-view w-full max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-surface-bright min-h-[80vh] font-body text-on-surface antialiased">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant/15 pb-6 mb-8 gap-4">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Managed Infrastructure</span>
          <Heading level={2} className="mt-1">
            {isEditMode ? `Manage Site: ${name}` : 'Provision New Site'}
          </Heading>
          <Text variant="small" className="mt-1 max-w-xl">
            {isEditMode 
              ? 'Configure deployment settings, custom domains, and associated templates.'
              : 'Deploy a managed front-end starter template bound to a specific tenant workspace.'}
          </Text>
        </div>
        
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/collections/hosted-sites')}
          className="uppercase tracking-widest text-xs"
        >
          <Icon name="arrow_back" size={16} />
          Return to Registry
        </Button>
      </div>

      {success && (
        <div className="mb-8 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-500/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-green-600" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 border border-error/15 animate-fade-slide-up">
          <Icon name="error" className="text-error" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-4 space-y-6">
          <Card variant="low" className="border border-outline-variant/15 p-6 bg-surface-container-low/30 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-primary/30 to-primary-container/30 filter blur-xl -z-10" />
            
            <div className="size-20 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center font-headline font-bold text-3xl ring-4 ring-surface-container-low">
              <Icon name="web" size={40} />
            </div>

            <Heading level={4} className="mt-4 text-xl tracking-tight text-on-surface truncate w-full">
              {name || 'Site Identity'}
            </Heading>
            
            <div className="mt-3">
              <Badge color={status === 'active' ? 'success' : status === 'failed' ? 'danger' : 'neutral'}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>

            <div className="pt-6 mt-6 w-full" />

            <div className="w-full text-left space-y-3">
              <span className="font-label text-[10px] uppercase tracking-widest text-outline block font-bold">Deployment Info</span>
              <div className="space-y-2">
                <div>
                  <span className="block text-[9px] text-outline uppercase tracking-wider">Template</span>
                  <span className="text-xs font-semibold text-on-surface">{template === 'nextjs-blog' ? 'Next.js Blog' : 'Astro Portfolio'}</span>
                </div>
                {deployedUrl && (
                  <div>
                    <span className="block text-[9px] text-outline uppercase tracking-wider">Internal URL</span>
                    <a href={deployedUrl} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-primary truncate block hover:underline">
                      {deployedUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <Card variant="low" className="border border-outline-variant/15 p-6 lg:p-8 bg-surface-container-low/30">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <Heading level={4} className="mb-1 text-xl">Site Configuration</Heading>
                <Text variant="small">Define the target environment and template settings for this deployment.</Text>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField 
                  label="Site Display Name"
                  id="siteName"
                  inputProps={{
                    value: name,
                    onChange: (e) => setName((e.target as HTMLInputElement).value)
                  }}
                  placeholder="e.g. My Awesome Blog"
                  required
                />

                <FormSelect
                  label="Starter Template"
                  id="siteTemplate"
                  selectProps={{
                    value: template,
                    onChange: (e) => setTemplate((e.target as HTMLSelectElement).value as any)
                  }}
                >
                  <option value="nextjs-blog">Next.js Blog (Modern editorial engine)</option>
                  <option value="astro-portfolio">Astro Portfolio (Lightweight showcase)</option>
                </FormSelect>
              </div>

              <FormSelect
                label="Target Tenant Workspace"
                id="siteTenant"
                selectProps={{
                  value: selectedTenantId,
                  onChange: (e) => setSelectedTenantId(e.target.value)
                }}
                required
              >
                <option value="">Select a workspace...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </FormSelect>

              <FormField 
                label="Custom Domain (Optional)"
                id="siteDomain"
                inputProps={{
                  value: domain,
                  onChange: (e) => setDomain((e.target as HTMLInputElement).value)
                }}
                placeholder="e.g. blog.my-domain.com"
              />

              <div className="pt-6 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/admin/collections/hosted-sites')}
                  className="uppercase tracking-widest text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? 'Provisioning...' : (isEditMode ? 'Update Site' : 'Provision Site')}
                </Button>
              </div>

            </form>
          </Card>
        </div>

      </div>

    </div>
  )
}
