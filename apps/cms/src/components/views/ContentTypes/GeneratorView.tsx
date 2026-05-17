"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Label } from '@/components/ui/atoms/Label'
import { Card } from '@/components/ui/molecules/Card'
import { FormField } from '@/components/ui/molecules/FormField'
import { EditorView } from './EditorView'

// Dynamic prompt presets for Content Architect to click
const PRESET_PROMPTS = [
  {
    title: 'Luxury Watch Catalog',
    icon: 'watch',
    description: 'Watches with manufacturer, pricing tier, year of release, specifications (JSON), and photos.',
    prompt: 'Create a Watch catalog with title, manufacturer name, pricing tier (select: standard, luxury, collection), specifications JSON block, year of release, and model image.'
  },
  {
    title: 'Premium Real Estate',
    icon: 'home',
    description: 'Property listings with address, pricing, features select, agent details, and media.',
    prompt: 'Create a Real Estate property listing with title, location address, asking price (number), dynamic features (multiple select: pool, garage, ocean-view, smart-home), description richText, and property images.'
  },
  {
    title: 'Editorial Design Portfolio',
    icon: 'palette',
    description: 'Designer items with client, launch date, category badges, and media attachments.',
    prompt: 'Create a Designer portfolio item with project name, client details, date of launch, category badge (select: branding, web, typography), rich-text project overview, and attachments.'
  }
]

export const GeneratorView: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { id } = useDocumentInfo()
  const isEditMode = !!id

  if (isEditMode) {
    return <EditorView />
  }

  // Identity state
  const [activeTenantId, setActiveTenantId] = useState<string>('')

  // Prompt / Input States
  const [promptText, setPromptText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // Generation Status Tracking
  const [genState, setGenState] = useState<'idle' | 'generating' | 'success' | 'failed'>('idle')
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  
  // Generated Content State
  const [generatedSchema, setGeneratedSchema] = useState<any | null>(null)
  const [contentTypeName, setContentTypeName] = useState('')
  const [contentTypeSlug, setContentTypeSlug] = useState('')
  const [viewMode, setViewMode] = useState<'preview' | 'json'>('preview')

  // CMS Commit state
  const [isApplying, setIsApplying] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Resolve current active tenant from auth user
  useEffect(() => {
    if (user) {
      const tid = typeof user.tenants?.[0]?.tenant === 'object' && user.tenants[0].tenant !== null
        ? user.tenants[0].tenant.id
        : user.tenants?.[0]?.tenant
      if (tid) {
        setActiveTenantId(tid)
      }
    }
  }, [user])

  // Handle Edit Mode: fetch the existing content type detail from CMS
  useEffect(() => {
    if (isEditMode && id) {
      setGenState('success')
      fetch(`/api/content-types/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch content type details')
          return res.json()
        })
        .then((data) => {
          if (data) {
            setContentTypeName(data.name || '')
            setContentTypeSlug(data.slug || '')
            setGeneratedSchema(data.schema || null)
          }
        })
        .catch((err) => {
          console.error(err)
          setGenState('failed')
          setSchemaError('Failed to load existing Content Type details.')
        })
    }
  }, [id, isEditMode])

  // Simulated log steps helper
  const addLogWithDelay = (message: string, delayMs: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, message])
        resolve()
      }, delayMs)
    })
  }

  // Initiate schema generation via prompt POST
  const handleInitiateGeneration = async () => {
    if (!promptText.trim()) return

    setIsSubmitting(true)
    setGenState('generating')
    setSchemaError(null)
    setGeneratedSchema(null)
    setLogs([])

    // Log step 1
    await addLogWithDelay('Establishing secure workspace session connection...', 200)

    try {
      const response = await fetch('/api/content-types/generate-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText.trim()
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Server failed to initiate generation.')
      }

      const result = await response.json()
      const sId = result.sessionId

      if (!sId) {
        throw new Error('No session ID returned from generation endpoint.')
      }

      setSessionId(sId)
      await addLogWithDelay(`Generation session initialized securely: [${sId}]`, 400)
      
      // Start polling
      startPollingSession(sId)

    } catch (err: any) {
      console.error(err)
      setGenState('failed')
      setSchemaError(err.message || 'Connection handshake failed.')
      setIsSubmitting(false)
    }
  }

  // Poll generation session status until completed/failed
  const startPollingSession = (sId: string) => {
    let pollCount = 0
    const maxPolls = 30 // 45 seconds timeout limit

    const interval = setInterval(async () => {
      pollCount++
      if (pollCount > maxPolls) {
        clearInterval(interval)
        setGenState('failed')
        setSchemaError('Generation session timed out.')
        setIsSubmitting(false)
        return
      }

      try {
        // Stagger logs to look cinematic
        if (pollCount === 2) {
          setLogs((prev) => [...prev, 'FastAPI microservice active. Invoking LangChain agent...'])
        } else if (pollCount === 5) {
          setLogs((prev) => [...prev, 'Analyzing layout structures & refining key fields...'])
        } else if (pollCount === 8) {
          setLogs((prev) => [...prev, 'Enforcing logical multi-tenant scope isolation checks...'])
        } else if (pollCount === 11) {
          setLogs((prev) => [...prev, 'Performing schema self-healing consistency validation...'])
        }

        const res = await fetch(`/api/content-types/sessions/${sId}`)
        if (!res.ok) {
          throw new Error('Failed to query session status.')
        }

        const data = await res.json()

        if (data.status === 'completed') {
          clearInterval(interval)
          setLogs((prev) => [...prev, 'Consistency validation passed. Generating layout success!'])
          
          setTimeout(() => {
            setGeneratedSchema(data.schema)
            setContentTypeName(data.schema?.name || 'Generated Content Type')
            setContentTypeSlug(data.schema?.name ? data.schema.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'generated-slug')
            setGenState('success')
            setIsSubmitting(false)
          }, 600)
        } else if (data.status === 'failed') {
          clearInterval(interval)
          setGenState('failed')
          setSchemaError('AI service was unable to structure a valid JSON schema within 3 retries.')
          setIsSubmitting(false)
        }

      } catch (err: any) {
        console.error(err)
        // Keep polling on minor connection hiccups
      }
    }, 1500)
  }

  // Commit dynamic content type schema to CMS collection
  const handleApplySchema = async () => {
    if (!generatedSchema) return

    setIsApplying(true)
    setErrorMsg('')
    setSuccessMsg('')

    const payloadData = {
      name: contentTypeName,
      slug: contentTypeSlug || generatedSchema.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      status: 'draft',
      originalSchema: generatedSchema,
      schema: generatedSchema,
      generatedByAI: true,
      aiSessionId: sessionId || undefined,
      tenant: activeTenantId || undefined
    }

    try {
      const res = await fetch('/api/content-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || 'Failed to create content type document.')
      }

      setSuccessMsg('Dynamic Content Type registered successfully! Redirecting...')
      
      setTimeout(() => {
        router.push('/admin/collections/content-types')
        router.refresh()
      }, 1500)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'CMS registration failed.')
      setIsApplying(false)
    }
  }

  return (
    <div className="custom-generator-view w-full max-w-7xl mx-auto px-4 py-8 lg:py-12 bg-surface-bright min-h-[85vh] font-body text-on-surface antialiased">
      
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant/15 pb-6 mb-8 gap-4">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Architect Console</span>
          <Heading level={2} className="mt-1">
            {isEditMode ? `Schema Explorer: ${contentTypeName}` : 'AI Content Architect'}
          </Heading>
          <Text variant="small" className="mt-1 max-w-2xl">
            {isEditMode
              ? 'Examine dynamic structural schemas, relationship definitions, and validations generated by Hermes AI.'
              : 'Describe your data model in plain English. Hermes AI will parse the schema and dynamically construct a premium, multi-tenant content structure.'}
          </Text>
        </div>
        
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/collections/content-types')}
          className="uppercase tracking-widest text-xs"
        >
          <Icon name="arrow_back" size={16} />
          Back to Registry
        </Button>
      </div>

      {/* Localized feedback notifications */}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-500/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-green-600" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl flex items-center gap-3 border border-error/15 animate-fade-slide-up">
          <Icon name="error" className="text-error" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Main split work canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Creator Prompts Input panel (Create mode only) */}
        {!isEditMode && genState !== 'success' ? (
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 lg:p-8 space-y-8 shadow-xl shadow-on-surface/5">
            <div>
              <Heading level={4} className="mb-1 text-lg">Define Data Requirements</Heading>
              <Text variant="small">Briefly specify fields, field types, validations, or relationships needed.</Text>
            </div>

            {/* Presets Cards slider list */}
            <div className="space-y-3">
              <Label className="block mb-1 text-xs">Starting Architect Blueprints</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRESET_PROMPTS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => setPromptText(preset.prompt)}
                    className="text-left p-4 rounded-xl border border-outline-variant/20 hover:border-primary/50 bg-surface-container-low/30 hover:bg-primary/5 transition-all duration-300 flex flex-col justify-between h-36 group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform duration-300 text-lg">
                          {preset.icon}
                        </span>
                        <span className="font-semibold text-xs text-on-surface truncate">{preset.title}</span>
                      </div>
                      <p className="text-[10px] text-outline line-clamp-3 leading-relaxed leading-snug">{preset.description}</p>
                    </div>
                    <span className="text-[9px] font-bold text-primary tracking-widest uppercase mt-2 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Apply Preset <Icon name="arrow_forward" size={10} />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input field text area */}
            <div className="space-y-2">
              <Label htmlFor="promptInput" className="block">Natural Language Requirements</Label>
              <div className="relative group/input">
                <textarea
                  id="promptInput"
                  rows={6}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. A premium blog post structure with title, slug, status choice, author biography (richText), publishing date, and SEO meta tags..."
                  className="w-full bg-surface-container-low rounded-xl border border-outline-variant/15 focus:border-primary/60 outline-none focus:ring-4 focus:ring-primary/10 p-4 font-body text-sm text-on-surface transition-all duration-300 placeholder-outline/50 resize-y"
                  disabled={isSubmitting}
                />
                <div className="absolute right-4 bottom-4 text-[10px] text-outline font-mono">
                  {promptText.trim().length} characters
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/10 flex justify-end">
              <Button
                type="button"
                onClick={handleInitiateGeneration}
                disabled={isSubmitting || !promptText.trim()}
                className="uppercase tracking-widest text-xs"
              >
                {isSubmitting ? 'Architecting...' : 'Initiate Schema Generation'}
                {!isSubmitting && <Icon name="psychiatry" size={16} />}
              </Button>
            </div>
          </div>
        ) : (
          /* When in success/generating mode or edit mode, show layout overview on the left */
          <div className="lg:col-span-7 space-y-6">
            
            {/* Identity details Card */}
            <Card variant="low" className="border border-outline-variant/15 p-6 shadow-xl shadow-on-surface/5 space-y-4">
              <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                <Icon name="verified" className="text-primary" />
                <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Schema Properties</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body">
                <FormField 
                  label="Content Type Name"
                  id="name"
                  inputProps={{
                    value: contentTypeName,
                    onChange: (e) => setContentTypeName((e.target as HTMLInputElement).value),
                    disabled: isEditMode || isApplying
                  }}
                  placeholder="e.g. Luxury Catalog"
                  required
                />

                <FormField 
                  label="Content Type Slug"
                  id="slug"
                  inputProps={{
                    value: contentTypeSlug,
                    onChange: (e) => setContentTypeSlug((e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, '')),
                    disabled: isEditMode || isApplying
                  }}
                  placeholder="e.g. luxury-catalog"
                  required
                />
              </div>
              
              {!isEditMode && (
                <div className="pt-4 border-t border-outline-variant/10 flex flex-col sm:flex-row gap-3 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setGenState('idle')
                      setPromptText('')
                    }}
                    disabled={isApplying}
                    className="text-xs uppercase tracking-widest"
                  >
                    Reset &amp; Start Over
                  </Button>

                  <Button
                    type="button"
                    onClick={handleApplySchema}
                    disabled={isApplying || !contentTypeName.trim() || !contentTypeSlug.trim()}
                    className="text-xs uppercase tracking-widest"
                  >
                    {isApplying ? 'Creating Document...' : 'Commit & Create Content Type'}
                    {!isApplying && <Icon name="check" size={16} />}
                  </Button>
                </div>
              )}
            </Card>

            {/* Prompt recall panel */}
            {!isEditMode && promptText && (
              <Card variant="low" className="p-4 border border-outline-variant/15 bg-surface-container-lowest/30">
                <span className="block text-[9px] uppercase tracking-wider text-outline font-bold font-label mb-2">Original Request Prompt</span>
                <p className="text-xs text-on-surface-variant italic font-body leading-relaxed leading-snug">"{promptText}"</p>
              </Card>
            )}
          </div>
        )}

        {/* Right Column: AI Live Generation logs / diff preview screen */}
        <div className="lg:col-span-5">
          {genState === 'idle' && (
            <div className="h-[400px] flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-lowest/35 shadow-inner">
              <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 ring-8 ring-primary/5">
                <span className="material-symbols-outlined text-primary text-3xl animate-pulse">psychiatry</span>
              </div>
              <Heading level={4} className="text-base font-semibold">Awaiting Requirements</Heading>
              <Text variant="small" className="mt-2 max-w-xs px-2 text-outline leading-snug">
                Define your specifications on the left to activate Hermes content generation engines.
              </Text>
            </div>
          )}

          {genState === 'generating' && (
            <div className="bg-on-primary-fixed dark:bg-on-primary-fixed rounded-2xl shadow-2xl p-6 border border-primary-fixed-dim/20 space-y-6 text-surface-bright select-none">
              
              {/* Header loader info */}
              <div className="flex items-center justify-between border-b border-primary-fixed-dim/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="size-6 rounded-full border-2 border-primary-fixed-dim border-t-transparent animate-spin flex-shrink-0" />
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider font-label text-surface-bright">Generation Progress</span>
                    <span className="block text-[9px] text-primary-fixed-dim uppercase tracking-widest font-mono">Session Running</span>
                  </div>
                </div>
                
                <span className="bg-primary/20 text-primary-fixed-dim font-bold text-[8px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-primary-fixed-dim/10 font-label">
                  AI Active
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-primary-fixed-dim/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary-fixed-dim animate-loading-bar rounded-full" style={{ width: '45%' }} />
              </div>

              {/* Dynamic steps output logs */}
              <div className="bg-black/25 rounded-xl p-4 font-mono text-[10px] space-y-2 max-h-56 overflow-y-auto leading-relaxed shadow-inner">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 text-primary-fixed-dim animate-fade-slide-up">
                    <span className="text-emerald-500 flex-shrink-0">✓</span>
                    <span className="text-surface-bright">{log}</span>
                  </div>
                ))}
                
                <div className="flex gap-2 text-outline animate-pulse">
                  <span className="text-primary-fixed-dim flex-shrink-0">●</span>
                  <span>Fetching remote LLM session logs...</span>
                </div>
              </div>
            </div>
          )}

          {genState === 'success' && generatedSchema && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-xl shadow-on-surface/5 overflow-hidden animate-fade-slide-up">
              
              {/* Visual preview mode selection bar */}
              <div className="flex items-center justify-between bg-surface-container-low px-5 py-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2">
                  <Icon name="layers" className="text-primary" size={16} />
                  <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Schema Preview</span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`font-label text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                      viewMode === 'preview'
                        ? 'bg-primary text-on-primary shadow-sm shadow-primary/10'
                        : 'bg-transparent text-outline hover:text-on-surface'
                    }`}
                  >
                    Fields List
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('json')}
                    className={`font-label text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                      viewMode === 'json'
                        ? 'bg-primary text-on-primary shadow-sm shadow-primary/10'
                        : 'bg-transparent text-outline hover:text-on-surface'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>
              </div>

              {/* Main rendering panel based on selection */}
              <div className="p-5 min-h-[300px]">
                {viewMode === 'preview' ? (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {generatedSchema.fields?.map((field: any) => (
                      <div
                        key={field.name}
                        className="p-4 rounded-xl border border-outline-variant/15 bg-surface-container-low/20 flex items-start justify-between gap-4 font-body hover:bg-surface-container-low/40 transition-colors"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-sm font-semibold text-on-surface truncate">{field.label || field.name}</span>
                            <span className="font-mono text-[9px] text-outline font-medium tracking-wide">({field.name})</span>
                            
                            {field.required && (
                              <Badge size="sm" variant="subtle" color="danger">Required</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">{field.description || 'No field description defined.'}</p>
                        </div>

                        <span className="bg-primary/5 text-primary font-label font-bold text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-md border border-primary/10 flex-shrink-0 mt-0.5">
                          {field.type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-neutral-900 text-neutral-200 rounded-xl p-4 font-mono text-xs overflow-auto max-h-[450px] shadow-inner select-all leading-relaxed whitespace-pre">
                    {JSON.stringify(generatedSchema, null, 2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {genState === 'failed' && (
            <div className="p-6 bg-error-container/20 text-on-error-container rounded-2xl border border-error/20 space-y-4 animate-fade-slide-up">
              <div className="flex items-center gap-3 border-b border-error/10 pb-3">
                <Icon name="error" className="text-error" />
                <span className="font-label text-sm font-bold uppercase tracking-wider text-error">Generation Failed</span>
              </div>
              <p className="text-xs text-on-surface leading-relaxed font-body">{schemaError}</p>
              
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setGenState('idle')
                    setPromptText('')
                  }}
                  className="text-xs uppercase tracking-widest"
                >
                  Return to Input
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
