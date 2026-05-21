"use client"

import React, { useState } from 'react'
import { setupInitialAdmin } from '@/app/(payload)/admin/actions'
import { Heading } from '../ui/atoms/Heading'
import { Text } from '../ui/atoms/Text'
import { Button } from '../ui/atoms/Button'
import { FormField } from '../ui/molecules/FormField'
import { Icon } from '../ui/atoms/Icon'
import { Badge } from '../ui/atoms/Badge'

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
    if (!pass) return { score: 0, label: 'Unentered', color: 'neutral' }
    let score = 0
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++

    if (score <= 1) return { score, label: 'Weak', color: 'danger' }
    if (score === 2) return { score, label: 'Fair', color: 'gold' }
    if (score === 3) return { score, label: 'Moderate', color: 'primary' }
    return { score, label: 'Strong', color: 'success' }
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
    <div className="min-h-screen flex flex-col md:flex-row antialiased font-body bg-background text-on-surface">
      {/* Left Side: Editorial Image & Headline */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-surface-container-lowest relative flex-col justify-between overflow-hidden shadow-2xl z-20">
        {/* Abstract Image Background */}
        <div className="absolute inset-0 z-0">
          <img 
            alt="Data Architecture Illustration" 
            className="w-full h-full object-cover opacity-90" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6QjzRn7LUOrPiZhCeWfg1YZM2A805SSo3b5lds4luOsKeTlaHfAs5rXhuzyCuTLOlJ98xD7zDWdj-3TRre3IEk9NREMnogYFIhHFoVwDP8-fSMZkE8KLVu_CBVchPQqTGn95908QxcWk-f0Sevn8At3Tu1p2WYoj7nOzUrLxOW0ey07IHmq6hVF_CM5zl8isAUn56fiCL7VH12EP6zZvzGU7r23kkejL9a9yTbe0ZNd_FxA-xnnga8o0hR1rk0ZINXbA8bn9xpHQk" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-container-lowest/60 via-transparent to-surface-container-lowest/90"></div>
        </div>
        
        {/* Top Brand */}
        <div className="relative z-10 p-10 lg:p-14">
          <div className="text-2xl font-headline font-black text-primary tracking-tighter">Hermes AI</div>
        </div>
        
        {/* Editorial Text */}
        <div className="relative z-10 p-10 lg:p-14 pb-16 lg:pb-24 mt-auto animate-soft-blur-in">
          <Heading level={1} className="font-headline font-normal text-4xl lg:text-5xl leading-tight text-on-background mb-6">
            Curate Your New<br/>
            <span className="italic text-tertiary">Digital Archive.</span>
          </Heading>
          <Text variant="large" className="text-on-surface-variant max-w-md leading-relaxed">
            {step === 1 && "Establish the foundational architecture of your knowledge base. Define access and governance."}
            {step === 2 && "Every archive needs a vessel. Define your workspace identity and organizational boundary."}
            {step === 3 && "Finalize the infrastructure by mapping your primary entryway. Claim your domain."}
          </Text>
        </div>
      </div>

      {/* Right Side: Setup Form */}
      <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col justify-center bg-surface-container-low min-h-screen relative overflow-y-auto">
        {/* Mobile Brand Header */}
        <div className="md:hidden p-6 bg-surface-container-lowest flex justify-center items-center shadow-sm relative z-10">
          <div className="text-2xl font-headline font-black text-primary tracking-tighter">Hermes AI</div>
        </div>

        <div className="w-full max-w-xl mx-auto p-8 lg:p-16 flex flex-col justify-center min-h-[inherit]">
          {/* Form Header */}
          <div className="mb-12 animate-soft-blur-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-lowest shadow-sm mb-6 border border-outline-variant/15">
              <Icon 
                name={step === 1 ? 'admin_panel_settings' : step === 2 ? 'business' : 'language'} 
                filled 
                className="text-primary text-2xl" 
                size={28}
              />
            </div>
            <Heading level={2} className="text-3xl text-on-background mb-3">
              {step === 1 && "Super Admin Initialization"}
              {step === 2 && "Workspace Identity"}
              {step === 3 && "Infrastructure Setup"}
            </Heading>
            <Text className="text-on-surface-variant text-base">
              {step === 1 && "Create the master credential responsible for system-wide configuration and governance."}
              {step === 2 && "Define the organizational identity used for branding and system internal mappings."}
              {step === 3 && "Configure the primary entry point for your headless engine infrastructure."}
            </Text>
          </div>

          {/* Setup Form */}
          <form action={setupInitialAdmin} onSubmit={handleSubmit} className="space-y-10">
            {/* Error Display */}
            {error && (
              <div className="p-4 bg-error-container/40 backdrop-blur-md text-on-error-container rounded-xl flex items-center gap-3 border border-error/20 animate-soft-blur-in">
                <Icon name="error" className="text-error" size={20} />
                <Text variant="small" className="font-semibold">{error}</Text>
              </div>
            )}

            {/* STEP 1: ADMIN PROFILE */}
            <div className={step !== 1 ? 'hidden' : 'space-y-8 animate-soft-blur-in'}>
              <div className="space-y-6">
                <FormField 
                  label="Administrator Name"
                  id="fullName"
                  name="name"
                  value={name}
                  onChange={(e: any) => { setName(e.target.value); setError('') }}
                  placeholder="e.g. Dr. Eleanor Vance"
                  inputProps={{ className: 'ring-1 ring-outline-variant/30 border-0 focus:ring-2' } as any}
                />
                
                <FormField 
                  label="Official Email Address"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e: any) => { setEmail(e.target.value); setError('') }}
                  type="email"
                  placeholder="eleanor@institution.edu"
                  inputProps={{ className: 'ring-1 ring-outline-variant/30 border-0 focus:ring-2' } as any}
                />
              </div>

              <div className="space-y-6 pt-4 border-t border-outline-variant/20">
                <div className="relative">
                  <FormField 
                    label="Master Password"
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e: any) => { setPassword(e.target.value); setError('') }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    inputProps={{ className: 'ring-1 ring-outline-variant/30 border-0 focus:ring-2 pr-12' } as any}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[42px] text-outline/50 hover:text-primary transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                  </button>
                  <p className="mt-3 text-xs font-label text-on-surface-variant flex items-center gap-2">
                    <Icon name="info" size={14} className="text-primary" /> 
                    Minimum 8 characters, including alphanumeric and symbols.
                  </p>
                </div>

                {password && (
                  <div className="pt-2 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-label text-[10px] uppercase tracking-widest text-outline">Complexity Rating</span>
                      <Badge color={pStrength.color} size="sm" variant="subtle">
                        {pStrength.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className={`h-full rounded-full transition-all duration-500 ${
                          pStrength.score >= idx 
                            ? (pStrength.score === 1 ? 'bg-error' : pStrength.score === 2 ? 'bg-tertiary' : 'bg-primary') 
                            : 'bg-outline-variant/10'
                        }`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2: WORKSPACE IDENTITY */}
            <div className={step !== 2 ? 'hidden' : 'space-y-8 animate-soft-blur-in'}>
              <div className="space-y-6">
                <FormField 
                  label="Workspace Name"
                  id="workspaceName"
                  name="workspaceName"
                  value={workspaceName}
                  onChange={(e: any) => { handleWorkspaceNameChange(e.target.value); setError('') }}
                  placeholder="e.g. Editorial Ops"
                  inputProps={{ className: 'ring-1 ring-outline-variant/30 border-0 focus:ring-2' } as any}
                />

                <FormField 
                  label="Workspace Slug"
                  id="workspaceSlug"
                  name="workspaceSlug"
                  value={workspaceSlug}
                  onChange={(e: any) => { handleWorkspaceSlugChange(e.target.value); setError('') }}
                  placeholder="editorial-ops"
                  inputProps={{ className: 'font-code text-primary ring-1 ring-outline-variant/30 border-0 focus:ring-2' } as any}
                />
                <Text variant="small" className="opacity-70 px-1 -mt-4">
                  Unique identifier used in system internal mappings and API routes.
                </Text>
              </div>
            </div>

            {/* STEP 3: DOMAIN SETUP */}
            <div className={step !== 3 ? 'hidden' : 'space-y-8 animate-soft-blur-in'}>
              <div className="space-y-6">
                <FormField 
                  label="Workspace Custom Domain"
                  id="workspaceDomain"
                  name="workspaceDomain"
                  value={workspaceDomain}
                  onChange={(e: any) => { handleDomainChange(e.target.value); setError('') }}
                  placeholder="e.g. editorial.org"
                  inputProps={{ className: 'ring-1 ring-outline-variant/30 border-0 focus:ring-2' } as any}
                />

                <div className="pt-4">
                  <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-8 border border-primary/10 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                      <Icon name="verified" size={80} />
                    </div>
                    <Badge color="primary" size="sm" icon="summarize" variant="subtle">Infrastructure Preview</Badge>
                    
                    <div className="grid grid-cols-2 gap-8 relative z-10">
                      <div>
                        <span className="block text-[10px] text-outline uppercase tracking-wider font-bold mb-1">Target</span>
                        <Text className="font-display font-bold truncate">{workspaceName || 'Undefined'}</Text>
                      </div>
                      <div>
                        <span className="block text-[10px] text-outline uppercase tracking-wider font-bold mb-1">Slug</span>
                        <Text className="font-code text-primary font-bold truncate">{workspaceSlug || 'undefined'}</Text>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-surface-container/50 rounded-xl p-4 flex items-center justify-between border border-white/40 dark:border-white/5 shadow-sm">
                      <div className="flex items-center gap-3 text-on-surface min-w-0">
                        <Icon name="lock" size={14} className="text-green-600 flex-shrink-0" />
                        <span className="font-display font-bold text-sm truncate">https://{workspaceDomain || 'domain.hermes.ai'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="pt-8 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {step > 1 && (
                  <Button 
                    variant="secondary"
                    onClick={() => { setStep(step - 1); setError('') }}
                    className="flex-1 py-4 rounded-xl"
                  >
                    <Icon name="arrow_back" size={18} />
                    Back
                  </Button>
                )}
                
                {step < 3 ? (
                  <Button 
                    onClick={step === 1 ? handleStep1Next : handleStep2Next}
                    className="flex-[2] py-4 rounded-xl"
                  >
                    {step === 1 ? 'Establish Identity' : 'Define Workspace'}
                    <Icon name="arrow_forward" size={18} />
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    isLoading={isSubmitting}
                    className="flex-[2] py-4 rounded-xl"
                  >
                    {isSubmitting ? 'Initializing...' : 'Establish Authority'}
                    {!isSubmitting && <Icon name="bolt" size={18} filled />}
                  </Button>
                )}
              </div>

              {/* Progress Indicator Dots */}
              <div className="flex justify-center gap-2 mt-4">
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      step === i ? 'w-8 bg-primary' : 'w-2 bg-outline-variant/30'
                    }`} 
                  />
                ))}
              </div>
            </div>
          </form>

          {/* Security Meta */}
          <div className="mt-12 text-center opacity-60">
            <p className="font-label text-xs tracking-[0.2em] uppercase text-outline flex items-center justify-center gap-2">
              <Icon name="encrypted" size={16} />
              End-to-End Encrypted Handshake
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
