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

export const CreateTenantPage: React.FC = () => {
  const router = useRouter()
  const { id } = useDocumentInfo()
  const isEditMode = !!id

  // View States
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugAuto, setIsSlugAuto] = useState(true)
  const [defaultLocale, setDefaultLocale] = useState('en')
  const [status, setStatus] = useState('active')
  const [tier, setTier] = useState('standard')
  
  // Domains State: Array of { hostname: string, isPrimary: boolean }
  const [domains, setDomains] = useState<{ hostname: string; isPrimary: boolean }[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [isDomainAuto, setIsDomainAuto] = useState(true)

  // Branding State
  const [primaryColor, setPrimaryColor] = useState('#3366cc')

  // Load existing tenant if in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true)
      fetch(`/api/tenants/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load tenant')
          return res.json()
        })
        .then((data) => {
          if (data) {
            setName(data.name || '')
            setSlug(data.slug || '')
            setIsSlugAuto(false)
            setDefaultLocale(data.defaultLocale || 'en')
            setStatus(data.status || 'active')
            setTier(data.tier || 'standard')
            setDomains(data.domains || [])
            setPrimaryColor(data.branding?.primaryColor || '#3366cc')
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Failed to load tenant data from registry.')
        })
        .finally(() => setIsLoading(false))
    }
  }, [id, isEditMode])

  // Real-time Slug and Domain Generator
  const handleNameChange = (val: string) => {
    setName(val)
    if (isSlugAuto && !isEditMode) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setSlug(generatedSlug)

      if (isDomainAuto) {
        if (generatedSlug) {
          setDomains([{ hostname: `${generatedSlug}.hermes.ai`, isPrimary: true }])
        } else {
          setDomains([])
        }
      }
    }
  }

  const handleSlugChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(sanitized)
    setIsSlugAuto(false)

    if (isDomainAuto && !isEditMode) {
      if (sanitized) {
        setDomains([{ hostname: `${sanitized}.hermes.ai`, isPrimary: true }])
      } else {
        setDomains([])
      }
    }
  }

  // Domain Management
  const handleAddDomain = () => {
    if (!newDomain.trim()) return
    const hostname = newDomain.toLowerCase().trim()
    
    // Format Validation
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(hostname)) {
      setError('Invalid domain format. Use e.g. brand.com or app.brand.com')
      return
    }

    // Duplicate Check
    if (domains.some(d => d.hostname === hostname)) {
      setError('This domain is already mapped to the workspace.')
      return
    }

    setIsDomainAuto(false)
    const isFirst = domains.length === 0
    setDomains([...domains, { hostname, isPrimary: isFirst }])
    setNewDomain('')
    setError('')
  }

  const handleRemoveDomain = (index: number) => {
    setIsDomainAuto(false)
    const removed = domains[index]
    const updated = domains.filter((_, i) => i !== index)
    
    // Re-assign primary if we deleted the primary domain
    if (removed.isPrimary && updated.length > 0) {
      updated[0].isPrimary = true
    }
    setDomains(updated)
  }

  const handleTogglePrimary = (index: number) => {
    setDomains(domains.map((d, i) => ({
      ...d,
      isPrimary: i === index
    })))
  }

  // Tier-based limits validation helper
  const getDomainLimit = () => {
    if (tier === 'standard') return 10
    if (tier === 'premium') return 50
    return Infinity
  }

  const domainLimit = getDomainLimit()
  const isDomainOverLimit = domains.length > domainLimit

  // Stepper Transitions
  const handleNextStep1 = () => {
    if (!name.trim()) {
      setError('Please enter a tenant name.')
      return
    }
    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) {
      setError('Slug must be lowercase alphanumeric characters and hyphens only.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleNextStep2 = () => {
    setError('')
    setStep(3)
  }

  // Creation/Editing Form Submit Action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validations
    if (!name.trim()) {
      setError('Please enter a workspace name.')
      return
    }
    if (domains.length === 0) {
      setError('Please map at least one domain entryway for the workspace.')
      return
    }
    if (isDomainOverLimit) {
      setError(`Your mapped domains exceed the selected tier limit of ${domainLimit}.`)
      return
    }

    setIsSubmitting(true)
    setError('')

    const payloadData = {
      name,
      slug,
      status,
      tier,
      defaultLocale,
      domains,
      branding: {
        primaryColor,
      }
    }

    try {
      const url = isEditMode ? `/api/tenants/${id}` : '/api/tenants'
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
        throw new Error(result.errors?.[0]?.message || result.message || 'An error occurred while saving the tenant.')
      }

      setSuccess(isEditMode ? 'Workspace updated successfully!' : 'Workspace initialized successfully!')
      
      // Delay redirect to let the success animation show
      setTimeout(() => {
        router.push('/admin/collections/tenants')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to submit tenant details.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <span className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <Text variant="body" className="text-outline font-medium">Fetching workspace settings from registry...</Text>
      </div>
    )
  }

  return (
    <div className="custom-tenant-view w-full max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-surface-bright min-h-[80vh] font-body text-on-surface antialiased">
      
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant/15 pb-6 mb-8 gap-4">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Workspace Console</span>
          <Heading level={2} className="mt-1">
            {isEditMode ? `Manage Workspace: ${name}` : 'Initialize New Tenant'}
          </Heading>
          <Text variant="small" className="mt-1 max-w-xl">
            {isEditMode 
              ? 'Configure branded entryways, resource limits, and appearance presets for this organizational boundary.'
              : 'Create an isolated workspace organizational unit governed by multi-tenant security policies.'}
          </Text>
        </div>
        
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/collections/tenants')}
          className="uppercase tracking-widest text-xs"
        >
          <Icon name="arrow_back" size={16} />
          Return to Registry
        </Button>
      </div>

      {/* Success Notification Banner */}
      {success && (
        <div className="mb-8 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-500/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-green-600" />
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

      {/* CREATE MODE: stepper wizard layout */}
      {!isEditMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Stepper vertical navigation */}
          <div className="lg:col-span-4 bg-surface-container-lowest/40 rounded-2xl border border-outline-variant/15 p-6 space-y-8 relative">
            <div className="absolute left-[34px] top-12 bottom-12 w-[1px] bg-outline-variant/15 -z-10" />

            <div className="flex items-start gap-4">
              <div className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all font-semibold ${
                step === 1 
                  ? 'bg-primary text-on-primary ring-4 ring-primary/20' 
                  : step > 1 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-surface-container text-outline'
              }`}>
                {step > 1 ? <Icon name="check" size={18} /> : '1'}
              </div>
              <div className="pt-1">
                <span className={`block font-label text-[10px] uppercase tracking-widest ${step === 1 ? 'font-bold text-primary' : 'text-outline'}`}>Step 01</span>
                <span className={`block text-sm font-semibold ${step === 1 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Tenant Identity</span>
                <span className="block text-xs text-outline">Workspace name &amp; slug</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all font-semibold ${
                step === 2 
                  ? 'bg-primary text-on-primary ring-4 ring-primary/20' 
                  : step > 2 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-surface-container text-outline'
              }`}>
                {step > 2 ? <Icon name="check" size={18} /> : '2'}
              </div>
              <div className="pt-1">
                <span className={`block font-label text-[10px] uppercase tracking-widest ${step === 2 ? 'font-bold text-primary' : 'text-outline'}`}>Step 02</span>
                <span className={`block text-sm font-semibold ${step === 2 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Service &amp; Status</span>
                <span className="block text-xs text-outline">Tier limits &amp; operation</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all font-semibold ${
                step === 3 
                  ? 'bg-primary text-on-primary ring-4 ring-primary/20' 
                  : 'bg-surface-container text-outline'
              }`}>
                '3'
              </div>
              <div className="pt-1">
                <span className={`block font-label text-[10px] uppercase tracking-widest ${step === 3 ? 'font-bold text-primary' : 'text-outline'}`}>Step 03</span>
                <span className={`block text-sm font-semibold ${step === 3 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Domains &amp; Branding</span>
                <span className="block text-xs text-outline">URLs &amp; Visual styles</span>
              </div>
            </div>

            <div className="pt-6 mt-8">
              <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-widest text-outline">
                <span>Setup Progress</span>
                <span className="text-primary font-bold">{Math.round(((step - 1) / 2) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper active form area */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 lg:p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* STEP 1: IDENTITY */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <Heading level={4} className="mb-1 text-xl">Workspace Identity</Heading>
                    <Text variant="small">Enter the structural metadata representing this unique client partition.</Text>
                  </div>

                  <FormField 
                    label="Workspace Name"
                    id="name"
                    inputProps={{
                      value: name,
                      onChange: (e) => handleNameChange((e.target as HTMLInputElement).value)
                    }}
                    placeholder="e.g. Editorial Ops"
                    required
                  />

                  <FormField 
                    label="Workspace Slug"
                    id="slug"
                    inputProps={{
                      value: slug,
                      onChange: (e) => handleSlugChange((e.target as HTMLInputElement).value)
                    }}
                    placeholder="e.g. editorial-ops"
                    required
                  />

                  <FormSelect
                    label="Default Locale"
                    id="defaultLocale"
                    selectProps={{
                      value: defaultLocale,
                      onChange: (e) => setDefaultLocale((e.target as HTMLSelectElement).value)
                    }}
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                  </FormSelect>

                  <div className="pt-6 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleNextStep1}
                      className="uppercase tracking-widest text-xs"
                    >
                      Proceed to Settings
                      <Icon name="arrow_forward" size={16} />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: SETTINGS (TIER & STATUS) */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <Heading level={4} className="mb-1 text-xl">Service Settings</Heading>
                    <Text variant="small">Select the performance limits and active system status for this tenant workspace.</Text>
                  </div>

                  {/* Visual Premium Tier Card Selectors */}
                  <div className="space-y-3">
                    <Label className="block mb-2">Service Tier</Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Standard Card */}
                      <button
                        type="button"
                        onClick={() => setTier('standard')}
                        className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-transparent ${
                          tier === 'standard' 
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                            : 'border-outline-variant/15 hover:border-outline-variant/15 hover:bg-surface-container-low/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Heading level={5} className="text-base">Standard</Heading>
                          <Icon name="verified" size={18} className={tier === 'standard' ? 'text-primary' : 'text-outline-variant'} />
                        </div>
                        <span className="font-headline font-bold text-xl block text-primary mb-3">$99<span className="text-xs font-normal text-outline">/mo</span></span>
                        <ul className="text-xs text-on-surface-variant space-y-1 list-none p-0 m-0">
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Up to 10 Domains</li>
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Standard CDN caching</li>
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Community support</li>
                        </ul>
                      </button>

                      {/* Premium Card */}
                      <button
                        type="button"
                        onClick={() => setTier('premium')}
                        className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-transparent ${
                          tier === 'premium' 
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                            : 'border-outline-variant/15 hover:border-outline-variant/15 hover:bg-surface-container-low/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Heading level={5} className="text-base">Premium</Heading>
                          <Icon name="stars" size={18} className={tier === 'premium' ? 'text-primary' : 'text-outline-variant'} />
                        </div>
                        <span className="font-headline font-bold text-xl block text-primary mb-3">$299<span className="text-xs font-normal text-outline">/mo</span></span>
                        <ul className="text-xs text-on-surface-variant space-y-1 list-none p-0 m-0">
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Up to 50 Domains</li>
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Global Edge CDN</li>
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Priority 24/7 support</li>
                        </ul>
                      </button>

                      {/* Enterprise Card */}
                      <button
                        type="button"
                        onClick={() => setTier('enterprise')}
                        className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-transparent ${
                          tier === 'enterprise' 
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                            : 'border-outline-variant/15 hover:border-outline-variant/15 hover:bg-surface-container-low/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Heading level={5} className="text-base">Enterprise</Heading>
                          <Icon name="corporate_fare" size={18} className={tier === 'enterprise' ? 'text-primary' : 'text-outline-variant'} />
                        </div>
                        <span className="font-headline font-bold text-xl block text-primary mb-3">Custom<span className="text-xs font-normal text-outline">/pricing</span></span>
                        <ul className="text-xs text-on-surface-variant space-y-1 list-none p-0 m-0">
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Unlimited Domains</li>
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Multi-region isolation</li>
                          <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-green-600" /> Dedicated SLA</li>
                        </ul>
                      </button>
                    </div>
                  </div>

                  <FormSelect
                    label="System Status"
                    id="status"
                    selectProps={{
                      value: status,
                      onChange: (e) => setStatus((e.target as HTMLSelectElement).value)
                    }}
                  >
                    <option value="active">Active (Standard operational status)</option>
                    <option value="suspended">Suspended (Block all tenant traffic)</option>
                    <option value="archived">Archived (Read-only historical freeze)</option>
                  </FormSelect>

                  <div className="pt-6 flex justify-between items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep(1)}
                      className="uppercase tracking-widest text-xs"
                    >
                      <Icon name="arrow_back" size={16} />
                      Back to Identity
                    </Button>

                    <Button
                      type="button"
                      onClick={handleNextStep2}
                      className="uppercase tracking-widest text-xs"
                    >
                      Proceed to Branding
                      <Icon name="arrow_forward" size={16} />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: DOMAINS & BRANDING */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Heading level={4} className="mb-1 text-xl">Domains &amp; Visual Customization</Heading>
                    <Text variant="small">Configure custom access urls and core brand color values mapping to this tenant workspace.</Text>
                  </div>

                  {/* Interactive Domain Mapping */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <Label>Mapped Access Domains</Label>
                      <span className="font-mono text-[10px] text-outline">
                        Tier Limit: {domains.length} / {domainLimit === Infinity ? '∞' : domainLimit}
                      </span>
                    </div>

                    {/* Limit warning banner */}
                    {isDomainOverLimit && (
                      <div className="p-3.5 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 border border-error/20 animate-fade-slide-up mb-2">
                        <Icon name="warning" className="text-error" />
                        <Text variant="small" className="text-error font-medium">Mapped domains exceed the {tier} tier limit of {domainLimit}. Delete domains to proceed.</Text>
                      </div>
                    )}

                    {/* Domain listing table style */}
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                      {domains.length === 0 ? (
                        <div className="text-center p-6 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/15 text-outline text-xs">
                          No domains currently mapped. Add at least one entryway.
                        </div>
                      ) : (
                        domains.map((dom, index) => (
                          <div 
                            key={dom.hostname}
                            className={`flex items-center justify-between p-3.5 rounded-xl border font-mono text-xs transition-all ${
                              dom.isPrimary 
                                ? 'bg-primary/5 border-primary/40 text-on-surface font-semibold' 
                                : 'bg-surface-container-low border-outline-variant/15 text-on-surface-variant'
                            }`}
                          >
                            <span className="truncate mr-4">{dom.hostname}</span>
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => handleTogglePrimary(index)}
                                className={`font-label text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md transition-all cursor-pointer border-none ${
                                  dom.isPrimary 
                                    ? 'bg-primary text-on-primary' 
                                    : 'bg-surface-container-high hover:bg-surface-container-highest text-outline hover:text-on-surface'
                                }`}
                              >
                                {dom.isPrimary ? 'Primary' : 'Make Primary'}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleRemoveDomain(index)}
                                className="text-outline-variant hover:text-error hover:bg-error/10 p-1.5 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                              >
                                <Icon name="delete" size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add domain input combo box */}
                    <div className="flex gap-2">
                      <FormField 
                        label=""
                        id="newDomain"
                        inputProps={{
                          value: newDomain,
                          onChange: (e) => setNewDomain((e.target as HTMLInputElement).value),
                          onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain() } }
                        }}
                        placeholder="e.g. cms.editorial.org"
                        className="flex-1 space-y-0"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddDomain}
                        className="font-label font-bold text-xs uppercase tracking-widest px-5 rounded-xl transition-all flex items-center gap-1.5 py-3.5"
                      >
                        <Icon name="add" size={16} />
                        Add Domain
                      </Button>
                    </div>
                  </div>

                  {/* Primary Color hex picker */}
                  <div className="space-y-2">
                    <Label>Brand Styling Tones</Label>
                    <div className="flex gap-4">
                      <FormField
                        label=""
                        id="primaryColor"
                        inputProps={{
                          value: primaryColor,
                          onChange: (e) => setPrimaryColor((e.target as HTMLInputElement).value)
                        }}
                        placeholder="#3366cc"
                        className="flex-1 space-y-0"
                      />

                      {/* Visual Color block preview & Native picker connector */}
                      <div className="relative size-14 rounded-xl border border-outline-variant/15 flex-shrink-0 overflow-hidden">
                        <div 
                          className="absolute inset-0 transition-colors"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <input 
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 opacity-0 size-full cursor-pointer"
                        />
                      </div>
                    </div>
                    <Text variant="small" className="text-[10px] px-1">
                      Visual brand accents (buttons, navigation selection highlight) used across this tenant's administration environment.
                    </Text>
                  </div>

                  {/* High-Fidelity Glassmorphic Preview Card */}
                  <Card variant="low" className="space-y-4">
                    <div className="flex items-center gap-2 pb-2.5">
                      <Icon name="summarize" size={16} className="text-primary" />
                      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Workspace Manifest Preview</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-medium text-on-surface-variant">
                      <div>
                        <span className="block text-[9px] text-outline uppercase tracking-wider">Tenant Name</span>
                        <span className="text-sm font-semibold text-on-surface">{name || 'Unentered'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-outline uppercase tracking-wider">Tenant Slug</span>
                        <span className="text-sm font-mono text-on-surface">{slug || 'unentered'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-outline uppercase tracking-wider">Tier Baseline</span>
                        <span className="text-sm text-primary font-semibold capitalize">{tier} Tier</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-outline uppercase tracking-wider">Default Locale</span>
                        <span className="text-sm text-on-surface uppercase">{defaultLocale}</span>
                      </div>
                    </div>

                    {domains.length > 0 && (
                      <div className="bg-surface-container rounded-lg p-3 flex items-center justify-between font-mono text-[11px]">
                        <div className="flex items-center gap-2 text-outline truncate mr-2">
                          <Icon name="lock" size={12} className="text-green-600 flex-shrink-0" />
                          <span className="truncate">https://{domains.find(d => d.isPrimary)?.hostname || domains[0].hostname}</span>
                        </div>
                        <span className="bg-green-600/10 text-green-700 dark:text-green-400 font-label font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0">
                          Primary URL
                        </span>
                      </div>
                    )}
                  </Card>

                  <div className="pt-6 flex justify-between items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep(2)}
                      className="uppercase tracking-widest text-xs"
                    >
                      <Icon name="arrow_back" size={16} />
                      Back to Settings
                    </Button>

                    <Button
                      type="submit"
                      disabled={isSubmitting || isDomainOverLimit}
                      className="uppercase tracking-widest text-xs"
                    >
                      {isSubmitting ? 'Initializing...' : 'Initialize Workspace'}
                    </Button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      ) : (
        /* EDIT MODE: Tabbed Settings Console */
        <Card variant="low" className="border border-outline-variant/15 p-6 lg:p-8 bg-surface-container-low/30">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column Fields */}
              <div className="space-y-6">
                <div>
                  <Heading level={4} className="mb-1 text-lg">Branding &amp; Colors</Heading>
                  <Text variant="small">Manage brand styling variables used inside the workspace.</Text>
                </div>

                <FormField 
                  label="Workspace Name"
                  id="name"
                  inputProps={{
                    value: name,
                    onChange: (e) => setName((e.target as HTMLInputElement).value)
                  }}
                  placeholder="e.g. Editorial Ops"
                  required
                />

                <div className="space-y-2">
                  <Label>Brand Accent Color</Label>
                  <div className="flex gap-4">
                    <FormField
                      label=""
                      id="primaryColor"
                      inputProps={{
                        value: primaryColor,
                        onChange: (e) => setPrimaryColor((e.target as HTMLInputElement).value)
                      }}
                      placeholder="#3366cc"
                      className="flex-1 space-y-0"
                    />
                    <div className="relative size-12 rounded-xl border border-outline-variant/15 flex-shrink-0 overflow-hidden">
                      <div 
                        className="absolute inset-0"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <input 
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="absolute inset-0 opacity-0 size-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormSelect
                    label="Service Tier"
                    id="tier"
                    selectProps={{
                      value: tier,
                      onChange: (e) => setTier((e.target as HTMLSelectElement).value)
                    }}
                  >
                    <option value="standard">Standard Tier</option>
                    <option value="premium">Premium Tier</option>
                    <option value="enterprise">Enterprise Tier</option>
                  </FormSelect>

                  <FormSelect
                    label="Default Locale"
                    id="defaultLocale"
                    selectProps={{
                      value: defaultLocale,
                      onChange: (e) => setDefaultLocale((e.target as HTMLSelectElement).value)
                    }}
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                  </FormSelect>
                </div>

                <FormSelect
                  label="Tenant Status"
                  id="status"
                  selectProps={{
                    value: status,
                    onChange: (e) => setStatus((e.target as HTMLSelectElement).value)
                  }}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </FormSelect>

              </div>

              {/* Right Column Fields */}
              <div className="space-y-6">
                <div>
                  <Heading level={4} className="mb-1 text-lg">Domains &amp; Entryways</Heading>
                  <Text variant="small">Manage custom URLs resolving into this workspace organizational container.</Text>
                </div>

                {isDomainOverLimit && (
                  <div className="p-3 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 border border-error/15 animate-fade-slide-up">
                    <Icon name="warning" className="text-error" />
                    <Text variant="small" className="text-error font-medium">Mapped domains exceed the {tier} tier limit of {domainLimit}. Delete domains to save.</Text>
                  </div>
                )}

                <div className="space-y-2">
                  {domains.map((dom, index) => (
                    <div 
                      key={dom.hostname}
                      className={`flex items-center justify-between p-3 rounded-xl border font-mono text-xs transition-all ${
                        dom.isPrimary 
                          ? 'bg-primary/5 border-primary/40 text-on-surface font-semibold' 
                          : 'bg-surface-container-low border-outline-variant/15 text-on-surface-variant'
                      }`}
                    >
                      <span className="truncate mr-4">{dom.hostname}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePrimary(index)}
                          className={`font-label text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition-all cursor-pointer border-none ${
                            dom.isPrimary 
                              ? 'bg-primary text-on-primary' 
                              : 'bg-surface-container-high hover:bg-surface-container-highest text-outline'
                          }`}
                        >
                          {dom.isPrimary ? 'Primary' : 'Make Primary'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveDomain(index)}
                          className="text-outline-variant hover:text-error hover:bg-error/10 p-1.5 rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        >
                          <Icon name="delete" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <FormField 
                    label=""
                    id="newDomain"
                    inputProps={{
                      value: newDomain,
                      onChange: (e) => setNewDomain((e.target as HTMLInputElement).value),
                      onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain() } }
                    }}
                    placeholder="e.g. site.brand.com"
                    className="flex-1 space-y-0"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddDomain}
                    className="font-label font-bold text-xs uppercase tracking-widest px-4 rounded-xl transition-all flex items-center gap-1 py-3"
                  >
                    <Icon name="add" size={14} />
                    Add
                  </Button>
                </div>

              </div>

            </div>

            {/* Form actions */}
            <div className="pt-6 flex justify-end gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/admin/collections/tenants')}
                className="uppercase tracking-widest text-xs"
              >
                Cancel Changes
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || isDomainOverLimit}
                className="uppercase tracking-widest text-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save Workspace'}
              </Button>
            </div>

          </form>
        </Card>
      )}

    </div>
  )
}
