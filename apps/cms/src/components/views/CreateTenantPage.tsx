"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDocumentInfo } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'

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
  const [primaryColor, setPrimaryColor] = useState('#094cb2')

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
            setPrimaryColor(data.branding?.primaryColor || '#094cb2')
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
        <p className="font-body text-outline font-medium">Fetching workspace settings from registry...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-surface-bright min-h-[80vh] font-body text-on-surface antialiased">
      
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant/15 pb-6 mb-8 gap-4">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Workspace Console</span>
          <h1 className="font-headline font-bold text-3xl text-on-surface mt-1">
            {isEditMode ? `Manage Workspace: ${name}` : 'Initialize New Tenant'}
          </h1>
          <p className="text-sm text-outline mt-1 max-w-xl">
            {isEditMode 
              ? 'Configure branded entryways, resource limits, and appearance presets for this organizational boundary.'
              : 'Create an isolated workspace organizational unit governed by multi-tenant security policies.'}
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => router.push('/admin/collections/tenants')}
          className="flex items-center gap-2 border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low px-4 py-2.5 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          <Icon name="arrow_back" size={16} />
          Return to Registry
        </button>
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
            <div className="absolute left-[34px] top-12 bottom-12 w-[1px] bg-outline-variant/30 -z-10" />

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

            <div className="pt-6 border-t border-outline-variant/15 mt-8">
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
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 lg:p-8 shadow-xl shadow-on-surface/5">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* STEP 1: IDENTITY */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline font-semibold text-xl mb-1 text-on-surface">Workspace Identity</h2>
                    <p className="text-xs text-outline">Enter the structural metadata representing this unique client partition.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Workspace Name</label>
                    <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                      <Icon name="business" size={20} className="text-outline ml-4 mr-1" />
                      <input 
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-4 px-3 font-body text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                        placeholder="e.g. Editorial Ops" 
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Workspace Slug</label>
                    <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                      <Icon name="link" size={20} className="text-outline ml-4 mr-1" />
                      <input 
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-4 px-3 font-mono text-sm text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                        placeholder="e.g. editorial-ops" 
                        required
                      />
                    </div>
                    <p className="text-[10px] text-outline px-1">
                      URL-safe identifier. Generated automatically, lowercase letters, numbers, and hyphens only.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Default Locale</label>
                    <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                      <Icon name="g_translate" size={20} className="text-outline ml-4 mr-1" />
                      <select 
                        value={defaultLocale}
                        onChange={(e) => setDefaultLocale(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-4 px-3 font-body text-on-surface focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="en">English (en)</option>
                        <option value="es">Spanish (es)</option>
                        <option value="fr">French (fr)</option>
                        <option value="de">German (de)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-outline-variant/10 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep1}
                      className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all cursor-pointer border-none"
                    >
                      Proceed to Settings
                      <Icon name="arrow_forward" size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: SETTINGS (TIER & STATUS) */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline font-semibold text-xl mb-1 text-on-surface">Service Settings</h2>
                    <p className="text-xs text-outline">Select the performance limits and active system status for this tenant workspace.</p>
                  </div>

                  {/* Visual Premium Tier Card Selectors */}
                  <div className="space-y-3">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1 block mb-2">Service Tier</label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Standard Card */}
                      <button
                        type="button"
                        onClick={() => setTier('standard')}
                        className={`text-left p-5 rounded-2xl border transition-all cursor-pointer bg-transparent ${
                          tier === 'standard' 
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                            : 'border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container-low/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-headline font-bold text-base text-on-surface">Standard</span>
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
                            : 'border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container-low/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-headline font-bold text-base text-on-surface">Premium</span>
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
                            : 'border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container-low/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-headline font-bold text-base text-on-surface">Enterprise</span>
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

                  <div className="space-y-2">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">System Status</label>
                    <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                      <Icon name="toggle_on" size={20} className="text-outline ml-4 mr-1" />
                      <select 
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-4 px-3 font-body text-on-surface focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="active">Active (Standard operational status)</option>
                        <option value="suspended">Suspended (Block all tenant traffic)</option>
                        <option value="archived">Archived (Read-only historical freeze)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-outline-variant/10 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 border border-outline-variant/30 text-on-surface hover:bg-surface-container-low py-3 px-6 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
                    >
                      <Icon name="arrow_back" size={16} />
                      Back to Identity
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep2}
                      className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all cursor-pointer border-none"
                    >
                      Proceed to Branding
                      <Icon name="arrow_forward" size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: DOMAINS & BRANDING */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline font-semibold text-xl mb-1 text-on-surface">Domains &amp; Visual Customization</h2>
                    <p className="text-xs text-outline">Configure custom access urls and core brand color values mapping to this tenant workspace.</p>
                  </div>

                  {/* Interactive Domain Mapping */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="font-label text-xs font-bold uppercase tracking-widest text-outline">Mapped Access Domains</label>
                      <span className="font-mono text-[10px] text-outline">
                        Tier Limit: {domains.length} / {domainLimit === Infinity ? '∞' : domainLimit}
                      </span>
                    </div>

                    {/* Limit warning banner */}
                    {isDomainOverLimit && (
                      <div className="p-3.5 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 border border-error/20 animate-fade-slide-up mb-2">
                        <Icon name="warning" className="text-error" />
                        <span className="font-body text-xs font-medium">Mapped domains exceed the {tier} tier limit of {domainLimit}. Delete domains to proceed.</span>
                      </div>
                    )}

                    {/* Domain listing table style */}
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                      {domains.length === 0 ? (
                        <div className="text-center p-6 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/30 text-outline text-xs">
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
                                    ? 'bg-primary text-on-primary shadow-sm shadow-primary/10' 
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
                      <div className="relative flex-1 flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="dns" size={18} className="text-outline ml-4 mr-1" />
                        <input 
                          type="text"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain() } }}
                          className="w-full bg-transparent border-none rounded-xl py-3 px-3 font-mono text-xs text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                          placeholder="e.g. cms.editorial.org" 
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDomain}
                        className="bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 font-label font-bold text-xs uppercase tracking-widest px-5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Icon name="add" size={16} />
                        Add Domain
                      </button>
                    </div>
                  </div>

                  {/* Primary Color hex picker */}
                  <div className="space-y-2">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Brand Styling Tones</label>
                    <div className="flex gap-4">
                      {/* Hex text input */}
                      <div className="flex-1 relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="palette" size={20} className="text-outline ml-4 mr-1" />
                        <input 
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-full bg-transparent border-none rounded-xl py-4 px-3 font-mono text-sm text-on-surface focus:outline-none focus:ring-0" 
                          placeholder="#094cb2" 
                        />
                      </div>

                      {/* Visual Color block preview & Native picker connector */}
                      <div className="relative size-14 rounded-xl shadow-lg border border-outline-variant/20 flex-shrink-0 overflow-hidden">
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
                    <p className="text-[10px] text-outline px-1">
                      Visual brand accents (buttons, navigation selection highlight) used across this tenant's administration environment.
                    </p>
                  </div>

                  {/* High-Fidelity Glassmorphic Preview Card */}
                  <div className="bg-surface-container-low/50 rounded-2xl p-5 border border-outline-variant/15 space-y-4">
                    <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-2.5">
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
                  </div>

                  <div className="pt-6 border-t border-outline-variant/10 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 border border-outline-variant/30 text-on-surface hover:bg-surface-container-low py-3 px-6 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
                    >
                      <Icon name="arrow_back" size={16} />
                      Back to Settings
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || isDomainOverLimit}
                      className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label font-bold text-xs uppercase tracking-widest py-3.5 px-8 rounded-xl transition-all cursor-pointer border-none ${
                        isSubmitting || isDomainOverLimit ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          Initializing...
                          <span className="size-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin ml-1" />
                        </>
                      ) : (
                        <>
                          Initialize Workspace
                          <Icon name="arrow_forward" size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      ) : (
        /* EDIT MODE: Tabbed Settings Console */
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 lg:p-8 shadow-xl shadow-on-surface/5">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column Fields */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-headline font-semibold text-lg mb-1 text-on-surface">Branding &amp; Colors</h3>
                  <p className="text-xs text-outline">Manage brand styling variables used inside the workspace.</p>
                </div>

                <div className="space-y-2">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Workspace Name</label>
                  <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                    <Icon name="business" size={20} className="text-outline ml-4 mr-1" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent border-none rounded-xl py-3 px-3 font-body text-on-surface focus:outline-none focus:ring-0" 
                      placeholder="e.g. Editorial Ops" 
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Brand Accent Color</label>
                  <div className="flex gap-4">
                    <div className="flex-1 relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                      <Icon name="palette" size={20} className="text-outline ml-4 mr-1" />
                      <input 
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-3 px-3 font-mono text-sm text-on-surface focus:outline-none focus:ring-0" 
                        placeholder="#094cb2" 
                      />
                    </div>
                    <div className="relative size-12 rounded-xl border border-outline-variant/20 flex-shrink-0 overflow-hidden">
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
                  <div className="space-y-2">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Service Tier</label>
                    <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                      <select 
                        value={tier}
                        onChange={(e) => setTier(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-3 px-3 font-body text-on-surface focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="standard">Standard Tier</option>
                        <option value="premium">Premium Tier</option>
                        <option value="enterprise">Enterprise Tier</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Default Locale</label>
                    <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                      <select 
                        value={defaultLocale}
                        onChange={(e) => setDefaultLocale(e.target.value)}
                        className="w-full bg-transparent border-none rounded-xl py-3 px-3 font-body text-on-surface focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="en">English (en)</option>
                        <option value="es">Spanish (es)</option>
                        <option value="fr">French (fr)</option>
                        <option value="de">German (de)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Tenant Status</label>
                  <div className="relative flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-transparent border-none rounded-xl py-3 px-3 font-body text-on-surface focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Right Column Fields */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-headline font-semibold text-lg mb-1 text-on-surface">Domains &amp; Entryways</h3>
                  <p className="text-xs text-outline">Manage custom URLs resolving into this workspace organizational container.</p>
                </div>

                {isDomainOverLimit && (
                  <div className="p-3 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 border border-error/20 animate-fade-slide-up">
                    <Icon name="warning" className="text-error" />
                    <span className="font-body text-xs font-medium">Mapped domains exceed the {tier} tier limit of {domainLimit}. Delete domains to save.</span>
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
                              ? 'bg-primary text-on-primary shadow-sm shadow-primary/10' 
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
                  <div className="relative flex-1 flex items-center rounded-xl bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                    <Icon name="dns" size={16} className="text-outline ml-4 mr-1" />
                    <input 
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain() } }}
                      className="w-full bg-transparent border-none rounded-xl py-2.5 px-3 font-mono text-xs text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                      placeholder="e.g. site.brand.com" 
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDomain}
                    className="bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 font-label font-bold text-xs uppercase tracking-widest px-4 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Icon name="add" size={14} />
                    Add
                  </button>
                </div>

              </div>

            </div>

            {/* Form actions */}
            <div className="pt-6 border-t border-outline-variant/10 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push('/admin/collections/tenants')}
                className="flex items-center gap-2 border border-outline-variant/30 text-on-surface hover:bg-surface-container-low py-3 px-6 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
              >
                Cancel Changes
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isDomainOverLimit}
                className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all cursor-pointer border-none ${
                  isSubmitting || isDomainOverLimit ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    Saving...
                    <span className="size-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin ml-1" />
                  </>
                ) : (
                  <>
                    Save Workspace Configuration
                    <Icon name="check" size={16} />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  )
}
