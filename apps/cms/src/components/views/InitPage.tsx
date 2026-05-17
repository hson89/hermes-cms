"use client"

import React, { useState } from 'react'
import { setupInitialAdmin } from '@/app/(payload)/admin/actions'
import { Icon } from '../ui/atoms/Icon'

export const InitPage: React.FC = () => {
  const [step, setStep] = useState(1)
  
  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [isSlugAuto, setIsSlugAuto] = useState(true)
  
  const [workspaceDomain, setWorkspaceDomain] = useState('')
  const [isDomainAuto, setIsDomainAuto] = useState(true)
  
  // UI & Validation States
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Password complexity helper
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Unentered', color: 'bg-outline-variant/30 text-outline' }
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++

    if (score <= 1) return { score, label: 'Weak', color: 'bg-error text-on-error' }
    if (score === 2) return { score, label: 'Fair', color: 'bg-tertiary text-on-tertiary' }
    if (score === 3) return { score, label: 'Moderate', color: 'bg-primary-container text-on-primary-container' }
    return { score, label: 'Strong', color: 'bg-green-600 text-white' }
  }

  const pStrength = calculatePasswordStrength(password)

  // Handlers for dynamic values
  const handleWorkspaceNameChange = (val: string) => {
    setWorkspaceName(val)
    if (isSlugAuto) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setWorkspaceSlug(slug)
      if (isDomainAuto) {
        setWorkspaceDomain(slug ? `${slug}.hermes.ai` : '')
      }
    }
  }

  const handleWorkspaceSlugChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setWorkspaceSlug(sanitized)
    setIsSlugAuto(false)
    if (isDomainAuto) {
      setWorkspaceDomain(sanitized ? `${sanitized}.hermes.ai` : '')
    }
  }

  const handleDomainChange = (val: string) => {
    setWorkspaceDomain(val.toLowerCase().trim())
    setIsDomainAuto(false)
  }

  // Next step click validators
  const handleStep1Next = () => {
    if (!name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid professional email address.')
      return
    }
    if (!password || password.length < 8) {
      setError('Administrative password must be at least 8 characters.')
      return
    }
    setError('')
    setStep(2)
  }

  const handleStep2Next = () => {
    if (!workspaceName.trim()) {
      setError('Please enter a workspace name.')
      return
    }
    if (!workspaceSlug.trim() || !/^[a-z0-9-]+$/.test(workspaceSlug)) {
      setError('Workspace slug must be lowercase alphanumeric characters and hyphens only.')
      return
    }
    setError('')
    setStep(3)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (step < 3) {
      e.preventDefault()
      if (step === 1) handleStep1Next()
      else if (step === 2) handleStep2Next()
    } else {
      if (!workspaceDomain.trim() || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(workspaceDomain)) {
        e.preventDefault()
        setError('Please enter a valid domain format, e.g. workspace.hermes.ai')
        return
      }
      setError('')
      setIsSubmitting(true)
    }
  }

  return (
    <div className="flex h-screen w-full bg-background font-body text-on-surface antialiased overflow-hidden">
      {/* SideNavBar from Alexandria Design System */}
      <aside className="bg-surface-container-low dark:bg-surface-dim h-screen w-72 flex flex-col sticky top-0 left-0 flex-shrink-0 z-40 border-r border-outline-variant/15">
        <div className="h-20 flex items-center px-6 gap-3 border-b border-outline-variant/15 flex-shrink-0">
          <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
            <Icon name="auto_awesome" filled size={24} className="font-semibold" />
          </div>
          <div>
            <span className="font-headline font-bold text-lg tracking-tight block">Alexandria</span>
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/75 font-semibold">CMS Engine v2.1</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="px-3 mb-3">
            <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Global Infrastructure</span>
          </div>
          
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container-high/50 cursor-pointer transition-colors">
            <Icon name="dns" size={20} className="text-outline" />
            <span className="font-body text-sm font-medium">Global Overview</span>
          </div>

          <div className="flex items-center justify-between px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container-high/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <Icon name="lan" size={20} className="text-outline" />
              <span className="font-body text-sm font-medium">Tenant Directory</span>
            </div>
            <span className="bg-primary/10 text-primary font-label text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Active</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container-high/50 cursor-pointer transition-colors">
            <Icon name="schema" size={20} className="text-outline" />
            <span className="font-body text-sm font-medium">Schema Registry</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container-high/50 cursor-pointer transition-colors">
            <Icon name="description" size={20} className="text-outline" />
            <span className="font-body text-sm font-medium">Deployment Logs</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-on-surface hover:bg-surface-container-high/50 cursor-pointer transition-colors">
            <Icon name="verified_user" size={20} className="text-outline" />
            <span className="font-body text-sm font-medium">Security &amp; Compliance</span>
          </div>

          <div className="pt-6">
            <button type="button" className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/15 text-primary font-label font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-lg transition-all border-none cursor-pointer">
              <Icon name="add" size={16} />
              Create New Tenant
            </button>
          </div>
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-outline-variant/15 bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/20 text-primary rounded-full flex items-center justify-center font-headline font-bold text-sm">
              EV
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate">Eleanor Vance</span>
              <span className="block text-xs text-outline truncate">Super Administrator</span>
            </div>
            <Icon name="settings" size={18} className="text-outline hover:text-on-surface cursor-pointer" />
          </div>
        </div>
      </aside>

      {/* Main Orchestration Canvas */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-background">
        {/* TopAppBar header override matching Alexandria */}
        <header className="bg-surface-container-lowest dark:bg-surface-container border-b border-outline-variant/15 flex justify-between items-center px-8 h-20 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="size-8 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" fill="currentColor"></path>
              </svg>
            </div>
            <div>
              <span className="font-headline font-bold text-lg tracking-tight block">CMS Orchestrator</span>
              <span className="font-label text-[9px] uppercase tracking-widest text-outline font-semibold">Workspace Provisioning Agent</span>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-primary font-label font-bold uppercase tracking-widest text-xs hover:opacity-75 transition-opacity border-none bg-transparent cursor-pointer"
          >
            <Icon name="arrow_back" size={16} />
            Return to Dashboard
          </button>
        </header>

        {/* Setup Canvas split with Progress Navigation & Form Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Step Progress Side-Panel */}
          <div className="w-80 border-r border-outline-variant/15 p-8 flex flex-col hidden lg:flex bg-surface-container-lowest/30">
            <div className="mb-8">
              <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Setup Progress</span>
              <h2 className="font-headline font-bold text-2xl text-on-surface mt-2">Initialization</h2>
            </div>
            
            <nav aria-label="Progress Stepper" className="space-y-8 relative">
              {/* Stepper Vertical Connecting Line */}
              <div className="absolute left-6 top-4 bottom-4 w-[2px] bg-surface-container-high -z-10" />

              {/* Step 1 Indicator */}
              <div className="flex items-start gap-4">
                <div className={`size-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                  step === 1 
                    ? 'bg-primary text-on-primary ring-4 ring-primary/20' 
                    : step > 1 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-surface-container-high text-outline'
                }`}>
                  {step > 1 ? (
                    <Icon name="check" size={20} className="font-bold" />
                  ) : (
                    <Icon name="person" size={20} filled={step === 1} />
                  )}
                </div>
                <div className="min-w-0 pt-1">
                  <span className={`block font-label text-xs uppercase tracking-widest ${step === 1 ? 'font-bold text-primary' : 'text-outline'}`}>Step 01</span>
                  <span className={`block text-sm font-semibold truncate ${step === 1 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Admin Profile</span>
                  <span className="block text-xs text-outline truncate">Super User Credentials</span>
                </div>
              </div>

              {/* Step 2 Indicator */}
              <div className="flex items-start gap-4">
                <div className={`size-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                  step === 2 
                    ? 'bg-primary text-on-primary ring-4 ring-primary/20' 
                    : step > 2 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-surface-container-high text-outline'
                }`}>
                  {step > 2 ? (
                    <Icon name="check" size={20} className="font-bold" />
                  ) : (
                    <Icon name="apartment" size={20} filled={step === 2} />
                  )}
                </div>
                <div className="min-w-0 pt-1">
                  <span className={`block font-label text-xs uppercase tracking-widest ${step === 2 ? 'font-bold text-primary' : 'text-outline'}`}>Step 02</span>
                  <span className={`block text-sm font-semibold truncate ${step === 2 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Workspace Identity</span>
                  <span className="block text-xs text-outline truncate">Naming &amp; Branding</span>
                </div>
              </div>

              {/* Step 3 Indicator */}
              <div className="flex items-start gap-4">
                <div className={`size-12 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                  step === 3 
                    ? 'bg-primary text-on-primary ring-4 ring-primary/20' 
                    : 'bg-surface-container-high text-outline'
                }`}>
                  <Icon name="dns" size={20} filled={step === 3} />
                </div>
                <div className="min-w-0 pt-1">
                  <span className={`block font-label text-xs uppercase tracking-widest ${step === 3 ? 'font-bold text-primary' : 'text-outline'}`}>Step 03</span>
                  <span className={`block text-sm font-semibold truncate ${step === 3 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Domain Setup</span>
                  <span className="block text-xs text-outline truncate">URL &amp; Routing</span>
                </div>
              </div>
            </nav>

            <div className="mt-auto pt-6 border-t border-outline-variant/15">
              <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-widest text-outline">
                <span>Status</span>
                <span className="text-primary">{Math.round(((step - 1) / 2) * 100)}% Complete</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Setup Progressive Form Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-12 lg:px-16 lg:py-16 flex justify-center bg-surface-bright">
            <div className="w-full max-w-2xl flex flex-col justify-start">
              
              {/* Heading Area with active step description */}
              <div className="mb-10">
                {step === 1 && (
                  <>
                    <h1 className="font-headline text-4xl text-on-surface leading-tight mb-3">Initialize Administrator</h1>
                    <p className="font-body text-outline text-lg">Configure the primary Super Admin profile. This account will retain indelible ownership over the tenant infrastructure and high-level structural settings.</p>
                  </>
                )}
                {step === 2 && (
                  <>
                    <h1 className="font-headline text-4xl text-on-surface leading-tight mb-3">Workspace Identity</h1>
                    <p className="font-body text-outline text-lg">Define the default workspace identity. This represents your organizational boundary or primary tenant name.</p>
                  </>
                )}
                {step === 3 && (
                  <>
                    <h1 className="font-headline text-4xl text-on-surface leading-tight mb-3">Domain &amp; Routing</h1>
                    <p className="font-body text-outline text-lg">Configure the initial routing endpoints for your workspace. Mapped hostnames enable isolated and branded entryways.</p>
                  </>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="mt-6 p-4 bg-error-container text-on-error-container rounded-lg flex items-center gap-3 border border-error/10 animate-fade-slide-up">
                    <Icon name="error" className="text-error" />
                    <span className="font-body text-sm font-medium">{error}</span>
                  </div>
                )}
              </div>

              {/* Form card - single form keeping inputs mounted */}
              <div className="bg-surface-container-lowest rounded-xl shadow-xl shadow-on-surface/5 border border-outline-variant/15 overflow-hidden">
                <form action={setupInitialAdmin} onSubmit={handleSubmit} className="p-8 space-y-8">
                  
                  {/* STEP 1: ADMIN PROFILE MUTATION */}
                  <div className={step !== 1 ? 'hidden' : 'space-y-6'}>
                    <div className="space-y-2">
                      <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Full Name</label>
                      <div className="relative flex items-center rounded-lg bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="badge" size={20} className="text-outline ml-4 mr-1" />
                        <input 
                          type="text"
                          name="name"
                          value={name}
                          onChange={(e) => { setName(e.target.value); setError('') }}
                          className="w-full bg-transparent border-none rounded-lg py-4 px-3 font-body text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                          placeholder="e.g. Eleanor Vance" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Professional Email</label>
                      <div className="relative flex items-center rounded-lg bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="mail" size={20} className="text-outline ml-4 mr-1" />
                        <input 
                          type="email"
                          name="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setError('') }}
                          className="w-full bg-transparent border-none rounded-lg py-4 px-3 font-body text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                          placeholder="e.g. e.vance@editorial.org" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Administrative Password</label>
                      <div className="relative flex items-center rounded-lg bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="key" size={20} className="text-outline ml-4 mr-1" />
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError('') }}
                          className="w-full bg-transparent border-none rounded-lg py-4 px-3 pr-12 font-body text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                          placeholder="••••••••" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 text-outline hover:text-on-surface transition-colors cursor-pointer border-none bg-transparent"
                        >
                          <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                        </button>
                      </div>

                      {/* Interactive Password Strength Display */}
                      {password && (
                        <div className="space-y-2 pt-2 animate-fade-slide-up">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-outline">Complexity Rating:</span>
                            <span className={`px-2 py-0.5 rounded font-label font-bold uppercase tracking-widest text-[9px] ${pStrength.color}`}>
                              {pStrength.label}
                            </span>
                          </div>
                          
                          {/* Segmented Strength Meter */}
                          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-300 ${pStrength.score >= 1 ? (pStrength.score === 1 ? 'bg-error' : pStrength.score === 2 ? 'bg-tertiary' : pStrength.score === 3 ? 'bg-primary' : 'bg-green-600') : 'bg-transparent'}`} />
                            <div className={`h-full rounded-full transition-all duration-300 ${pStrength.score >= 2 ? (pStrength.score === 2 ? 'bg-tertiary' : pStrength.score === 3 ? 'bg-primary' : 'bg-green-600') : 'bg-transparent'}`} />
                            <div className={`h-full rounded-full transition-all duration-300 ${pStrength.score >= 3 ? (pStrength.score === 3 ? 'bg-primary' : 'bg-green-600') : 'bg-transparent'}`} />
                            <div className={`h-full rounded-full transition-all duration-300 ${pStrength.score >= 4 ? 'bg-green-600' : 'bg-transparent'}`} />
                          </div>

                          {/* Quick validation requirements checklist */}
                          <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px] text-outline">
                            <div className="flex items-center gap-1.5">
                              <Icon name={password.length >= 8 ? 'check_circle' : 'circle'} size={12} className={password.length >= 8 ? 'text-green-600' : 'text-outline-variant'} />
                              <span>Min 8 characters</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Icon name={/[A-Z]/.test(password) ? 'check_circle' : 'circle'} size={12} className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-outline-variant'} />
                              <span>Upper case letter</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Icon name={/[0-9]/.test(password) ? 'check_circle' : 'circle'} size={12} className={/[0-9]/.test(password) ? 'text-green-600' : 'text-outline-variant'} />
                              <span>Contains number</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Icon name={/[^A-Za-z0-9]/.test(password) ? 'check_circle' : 'circle'} size={12} className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-outline-variant'} />
                              <span>Special symbol</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STEP 2: WORKSPACE IDENTITY MUTATION */}
                  <div className={step !== 2 ? 'hidden' : 'space-y-6'}>
                    <div className="space-y-2">
                      <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Workspace Name</label>
                      <div className="relative flex items-center rounded-lg bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="business" size={20} className="text-outline ml-4 mr-1" />
                        <input 
                          type="text"
                          name="workspaceName"
                          value={workspaceName}
                          onChange={(e) => { handleWorkspaceNameChange(e.target.value); setError('') }}
                          className="w-full bg-transparent border-none rounded-lg py-4 px-3 font-body text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                          placeholder="e.g. Editorial Ops" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Workspace Slug</label>
                      <div className="relative flex items-center rounded-lg bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="link" size={20} className="text-outline ml-4 mr-1" />
                        <input 
                          type="text"
                          name="workspaceSlug"
                          value={workspaceSlug}
                          onChange={(e) => { handleWorkspaceSlugChange(e.target.value); setError('') }}
                          className="w-full bg-transparent border-none rounded-lg py-4 px-3 font-mono text-sm text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                          placeholder="e.g. editorial-ops" 
                        />
                      </div>
                      <p className="text-[11px] text-outline px-1">
                        Unique, URL-safe identifier for your workspace. Lowercase alphanumeric and hyphens only.
                      </p>
                    </div>
                  </div>

                  {/* STEP 3: DOMAIN SETUP MUTATION */}
                  <div className={step !== 3 ? 'hidden' : 'space-y-6'}>
                    <div className="space-y-2">
                      <label className="font-label text-xs font-bold uppercase tracking-widest text-outline px-1">Workspace Custom Domain</label>
                      <div className="relative flex items-center rounded-lg bg-surface-container-low border border-outline-variant/20 focus-within:border-primary/40 focus-within:bg-surface-container-high transition-all">
                        <Icon name="language" size={20} className="text-outline ml-4 mr-1" />
                        <input 
                          type="text"
                          name="workspaceDomain"
                          value={workspaceDomain}
                          onChange={(e) => { handleDomainChange(e.target.value); setError('') }}
                          className="w-full bg-transparent border-none rounded-lg py-4 px-3 font-body text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-0" 
                          placeholder="e.g. editorial.org" 
                        />
                      </div>
                      <p className="text-[11px] text-outline px-1">
                        Map a custom hostname to access this tenant workspace. Enter domain in standard format, e.g. client.domain.com
                      </p>
                    </div>

                    {/* High-Fidelity Glassmorphic Preview Card */}
                    <div className="pt-4">
                      <div className="bg-surface-container-low/50 dark:bg-surface-dim/40 rounded-xl p-6 border border-outline-variant/15 space-y-4">
                        <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                          <Icon name="summarize" size={18} className="text-primary" />
                          <span className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">Workspace Metadata Preview</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-medium text-on-surface-variant">
                          <div>
                            <span className="block text-[10px] text-outline uppercase tracking-wider">Workspace Name</span>
                            <span className="text-sm font-semibold text-on-surface">{workspaceName || 'Unentered'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-outline uppercase tracking-wider">Workspace Slug</span>
                            <span className="text-sm font-mono text-on-surface">{workspaceSlug || 'unentered'}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-outline uppercase tracking-wider">Tier Baseline</span>
                            <span className="text-sm text-primary font-semibold">Standard Tier</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-outline uppercase tracking-wider">Default Locale</span>
                            <span className="text-sm text-on-surface">English (en)</span>
                          </div>
                        </div>

                        <div className="bg-surface-container rounded-lg p-3 flex items-center justify-between font-mono text-[11px]">
                          <div className="flex items-center gap-2 text-outline truncate mr-2">
                            <Icon name="lock" size={12} className="text-green-600 flex-shrink-0" />
                            <span className="truncate">https://{workspaceDomain || 'domain.com'}</span>
                          </div>
                          <span className="bg-green-600/10 text-green-700 dark:text-green-400 font-label font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 rounded flex-shrink-0">
                            Primary Entryway
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Navigation Bar */}
                  <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between gap-4">
                    {/* BACK BUTTONS */}
                    {step > 1 ? (
                      <button 
                        type="button"
                        onClick={() => { setStep(step - 1); setError('') }}
                        className="flex items-center gap-2 border border-outline-variant/30 text-on-surface hover:bg-surface-container-low py-4 px-6 rounded-lg transition-all font-label font-bold text-xs uppercase tracking-widest border-none bg-transparent cursor-pointer"
                      >
                        <Icon name="arrow_back" size={16} />
                        {step === 2 ? 'Back to Profile' : 'Back to Identity'}
                      </button>
                    ) : (
                      <div />
                    )}

                    {/* FORWARD BUTTONS */}
                    {step === 1 && (
                      <button 
                        type="button"
                        onClick={handleStep1Next}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-lg transition-all cursor-pointer border-none"
                      >
                        Proceed to Identity
                        <Icon name="arrow_forward" size={16} />
                      </button>
                    )}

                    {step === 2 && (
                      <button 
                        type="button"
                        onClick={handleStep2Next}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label font-bold text-xs uppercase tracking-widest py-4 px-6 rounded-lg transition-all cursor-pointer border-none"
                      >
                        Proceed to Domain
                        <Icon name="arrow_forward" size={16} />
                      </button>
                    )}

                    {step === 3 && (
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label font-bold text-xs uppercase tracking-widest py-4 px-8 rounded-lg transition-all cursor-pointer border-none ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                    )}
                  </div>
                </form>
              </div>

              <p className="text-center font-label text-[9px] uppercase tracking-[0.25em] text-outline/50 pt-8">
                Secure Initialization Protocol Active • Bounded Context Scope
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
