"use client"

import React, { useState, useEffect } from 'react'
import { useField, useAuth, useDocumentInfo } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Button } from '@/components/ui/atoms/Button'
import { Label } from '@/components/ui/atoms/Label'
import { Card } from '@/components/ui/molecules/Card'
import { Badge } from '@/components/ui/atoms/Badge'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'

interface FieldDefinition {
  name: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'richText' | 'relationship' | 'array' | 'blocks'
  required?: boolean
  unique?: boolean
  localized?: boolean
  defaultValue?: any
  options?: string[]
  relationTo?: string
  description?: string
}

export const FieldsDataEditor: React.FC<any> = () => {
  const { user } = useAuth()
  const { id: docId } = useDocumentInfo()

  // Resolve active tenant ID from auth
  const activeTenantId = React.useMemo(() => {
    return (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant
  }, [user])

  // Bind to the fieldsData and contentType fields using Payload's useField hook
  const { value: fieldsData = {}, setValue: setFieldsData } = useField<Record<string, any>>({ path: 'fieldsData' })
  const { value: contentType } = useField<any>({ path: 'contentType' })

  // Extract content type ID reactively
  const contentTypeId = typeof contentType === 'object' && contentType !== null 
    ? contentType.id 
    : contentType

  // Editor states
  const [schemaFields, setSchemaFields] = useState<FieldDefinition[]>([])
  const [contentTypeName, setContentTypeName] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Relationship dropdown options dictionary
  const [relationOptions, setRelationOptions] = useState<Record<string, { id: any; label: string }[]>>({})

  // Inline AI Refinement states
  const [refinementField, setRefinementField] = useState<string | null>(null)
  const [refinementPrompt, setRefinementPrompt] = useState<string>('')
  const [isRefining, setIsRefining] = useState<string | null>(null)
  const [fieldHighlights, setFieldHighlights] = useState<Record<string, boolean>>({})

  // 1. Fetch Dynamic Schema when selected Content Type changes
  useEffect(() => {
    if (!contentTypeId) {
      setSchemaFields([])
      setContentTypeName('')
      return
    }

    setIsLoading(true)
    setError('')

    fetch(`/api/content-types/${contentTypeId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Content Type schema details.')
        return res.json()
      })
      .then((data) => {
        if (data) {
          setContentTypeName(data.name || '')
          setSchemaFields(data.schema?.fields || [])
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Failed to fetch the dynamic schema for this content type.')
      })
      .finally(() => setIsLoading(false))
  }, [contentTypeId])

  // 2. Fetch Options for Relationship fields dynamically
  useEffect(() => {
    schemaFields.forEach((field) => {
      if (field.type === 'relationship' && field.relationTo) {
        const relationTo = field.relationTo
        if (!relationOptions[relationTo]) {
          fetch(`/api/${relationTo}?limit=100`)
            .then((res) => res.json())
            .then((data) => {
              if (data && data.docs) {
                const options = data.docs.map((doc: any) => ({
                  id: doc.id,
                  label: doc.title || doc.name || doc.email || doc.label || `ID: ${doc.id}`,
                }))
                setRelationOptions((prev) => ({
                  ...prev,
                  [relationTo]: options,
                }))
              }
            })
            .catch((err) => console.error(`Failed to fetch relationship options for ${relationTo}:`, err))
        }
      }
    })
  }, [schemaFields, relationOptions])

  // Update dynamic fieldsData JSON state
  const handleFieldChange = (fieldName: string, fieldValue: any) => {
    const updated = {
      ...(fieldsData || {}),
      [fieldName]: fieldValue,
    }
    setFieldsData(updated)
  }

  // Trigger inline AI Refinement for a specific field
  const handleRefineField = async (fieldName: string, promptText: string) => {
    if (!promptText.trim()) return

    setIsRefining(fieldName)
    try {
      const res = await fetch('/api/ai/refine-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `For the field '${fieldName}', apply this change: ${promptText}`,
          current_draft_json: { [fieldName]: fieldsData?.[fieldName] || '' },
          content_schema: { fields: schemaFields },
          style_modifier_id: null,
          tenantId: activeTenantId,
        }),
      })

      const data = await res.json()
      if (data.draft && data.draft[fieldName] !== undefined) {
        handleFieldChange(fieldName, data.draft[fieldName])
        
        // Trigger subtle success highlight animation
        setFieldHighlights(prev => ({ ...prev, [fieldName]: true }))
        setTimeout(() => {
          setFieldHighlights(prev => ({ ...prev, [fieldName]: false }))
        }, 3000)

        setRefinementField(null)
        setRefinementPrompt('')
      } else {
        throw new Error(data.error || 'No refined content returned by AI.')
      }
    } catch (err: any) {
      console.error(err)
      alert(`Refinement failed: ${err.message}`)
    } finally {
      setIsRefining(null)
    }
  }

  // Loading indicator overlay
  if (isLoading) {
    return (
      <div className="p-8 border border-outline-variant/15 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center min-h-[240px] animate-pulse">
        <span className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
        <Text variant="body" className="text-outline font-label text-xs uppercase tracking-wider font-bold">
          Configuring Authoring Canvas...
        </Text>
      </div>
    )
  }

  // Error boundary indicator
  if (error) {
    return (
      <Card variant="high" className="border border-red-500/25 bg-red-500/5 p-6 rounded-2xl">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <Icon name="error" size={24} />
          <Heading level={4} className="font-bold">Schema Load Failed</Heading>
        </div>
        <Text variant="small" className="text-outline mt-2">{error}</Text>
      </Card>
    )
  }

  // Placeholder when Content Type is not selected
  if (!contentTypeId) {
    return (
      <div className="p-10 border-2 border-dashed border-outline-variant/30 rounded-3xl bg-surface-container-low/20 text-center flex flex-col items-center justify-center min-h-[220px]">
        <div className="size-16 rounded-full bg-primary/5 text-primary flex items-center justify-center shadow-inner mb-4">
          <Icon name="layers" size={32} />
        </div>
        <Heading level={4} className="font-headline font-bold text-on-surface">Select a Content Type</Heading>
        <Text variant="small" className="text-outline mt-1.5 max-w-sm leading-relaxed">
          Please assign a Content Type schema in the sidebar to dynamically deploy the custom authoring fields.
        </Text>
      </div>
    )
  }

  return (
    <Card variant="low" className="border border-outline-variant/15 p-6 md:p-8 space-y-6 shadow-xl shadow-on-surface/5 relative overflow-hidden bg-surface-bright/80 backdrop-blur-md">
      
      {/* Editorial Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4 mb-2 select-none">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <Icon name="edit_note" size={22} filled />
          </div>
          <div>
            <span className="font-label text-[9px] uppercase tracking-widest text-outline font-bold">Dynamic Authoring Canvas</span>
            <Heading level={4} className="font-headline font-bold text-on-surface mt-0.5 text-lg">
              {contentTypeName || 'Content Field Entries'}
            </Heading>
          </div>
        </div>
        <Badge color="gold" size="sm" icon="auto_awesome">
          AI-Scoped Fields
        </Badge>
      </div>

      {schemaFields.length === 0 ? (
        <div className="p-8 text-center text-outline italic text-sm">
          No schema fields defined for this content type. Add fields on the content types editor canvas.
        </div>
      ) : (
        <div className="space-y-6">
          {schemaFields.map((field) => {
            const fieldVal = fieldsData?.[field.name] ?? ''
            const isFieldRefining = isRefining === field.name
            const isHighlighted = !!fieldHighlights[field.name]

            return (
              <div 
                key={field.name} 
                className={`space-y-2 p-4 rounded-2xl border transition-all duration-300 relative ${
                  isHighlighted 
                    ? 'border-emerald-500/50 bg-emerald-500/[0.03] scale-[1.005] shadow-lg shadow-emerald-500/5' 
                    : 'border-outline-variant/10 hover:border-outline-variant/20 hover:bg-surface-container-low/10'
                }`}
              >
                {/* Field Header Label & AI Sparkle button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`canvas-${field.name}`} className="font-label font-bold text-xs uppercase tracking-wider text-outline">
                      {field.label || field.name}
                    </Label>
                    {field.required && (
                      <span className="text-red-500 text-xs font-bold leading-none">*</span>
                    )}
                  </div>

                  {/* Sparkling AI Assistant Badge */}
                  {(field.type === 'text' || field.type === 'richText') && (
                    <button
                      type="button"
                      onClick={() => setRefinementField(refinementField === field.name ? null : field.name)}
                      className={`size-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                        refinementField === field.name 
                          ? 'bg-tertiary text-on-tertiary border-tertiary shadow-md' 
                          : 'bg-tertiary/5 hover:bg-tertiary/10 text-tertiary border-tertiary/20 hover:scale-105 active:scale-95'
                      }`}
                      title="Refine this specific field using Alexandria AI"
                    >
                      <Icon name="auto_awesome" size={14} filled={refinementField === field.name} />
                    </button>
                  )}
                </div>

                {/* Field description */}
                {field.description && (
                  <span className="block font-body text-[10px] text-outline leading-normal mt-0.5 max-w-2xl select-none">
                    {field.description}
                  </span>
                )}

                {/* Sparkles Micro-drawer for specific field AI refinement */}
                {refinementField === field.name && (
                  <div className="mt-2.5 p-3.5 rounded-xl border border-tertiary/20 bg-tertiary/[0.02] space-y-3 animate-soft-blur-in select-none">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        placeholder={`Instruct AI to edit this field (e.g. "make it professional", "shorten it")...`}
                        className="flex-1 text-sm py-2 px-3 h-10 rounded-lg"
                        disabled={isFieldRefining}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRefineField(field.name, refinementPrompt)
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => handleRefineField(field.name, refinementPrompt)}
                        disabled={isFieldRefining || !refinementPrompt.trim()}
                        className="text-xs py-2 px-4 h-10 rounded-full"
                      >
                        {isFieldRefining && <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                        Refine
                      </Button>
                    </div>

                    {/* Pre-made quick action buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1 select-none">
                      {[
                        { label: 'Professional Tone', prompt: 'Rewrite with a polished, highly professional editorial tone' },
                        { label: 'Creative Twist', prompt: 'Rewrite to make it highly engaging, creative, and evocative' },
                        { label: 'Condense (30%)', prompt: 'Shorten this content to be about 30% shorter, keeping key points' },
                        { label: 'Fix Spelling & Grammar', prompt: 'Correct any spelling mistakes or grammatical issues, preserving the meaning' }
                      ].map((action, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setRefinementPrompt(action.prompt)
                            handleRefineField(field.name, action.prompt)
                          }}
                          disabled={isFieldRefining}
                          className="bg-surface-container-lowest hover:bg-tertiary/5 text-tertiary text-[9px] font-label font-bold px-2.5 py-1.5 rounded-md border border-outline-variant/15 hover:border-tertiary/25 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render appropriate Input based on Dynamic Field Type */}
                <div className="mt-1 relative animate-soft-blur-in">
                  
                  {isFieldRefining && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                      <div className="flex items-center gap-2 text-primary font-label text-[10px] font-bold uppercase tracking-widest">
                        <span className="size-3.5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        AI Rebuilding...
                      </div>
                    </div>
                  )}

                  {field.type === 'text' && (
                    <Input
                      id={`canvas-${field.name}`}
                      type="text"
                      value={fieldVal ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={`Enter text value...`}
                      disabled={isFieldRefining}
                    />
                  )}

                  {field.type === 'number' && (
                    <Input
                      id={`canvas-${field.name}`}
                      type="number"
                      value={fieldVal ?? ''}
                      onChange={(e) => {
                        const v = e.target.value === '' ? '' : Number(e.target.value)
                        handleFieldChange(field.name, v)
                      }}
                      placeholder={`Enter numeric value...`}
                      disabled={isFieldRefining}
                    />
                  )}

                  {field.type === 'boolean' && (
                    <div className="flex items-center gap-3 py-1 bg-transparent select-none">
                      <input
                        id={`canvas-${field.name}`}
                        type="checkbox"
                        checked={!!fieldVal}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        className="size-5 rounded text-primary border-outline-variant/30 focus:ring-primary cursor-pointer accent-primary"
                        disabled={isFieldRefining}
                      />
                      <label htmlFor={`canvas-${field.name}`} className="font-body text-sm font-semibold text-on-surface-variant cursor-pointer select-none">
                        Enabled and Active
                      </label>
                    </div>
                  )}

                  {field.type === 'select' && (
                    <Select
                      id={`canvas-${field.name}`}
                      value={fieldVal ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={isFieldRefining}
                    >
                      <option value="">-- Select option... --</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  )}

                  {field.type === 'richText' && (
                    <textarea
                      id={`canvas-${field.name}`}
                      value={fieldVal ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={`Compose rich editorial narrative here...`}
                      rows={5}
                      className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-4 py-3.5 font-body text-on-surface text-base focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary transition-all shadow-sm resize-y leading-relaxed"
                      disabled={isFieldRefining}
                    />
                  )}

                  {field.type === 'relationship' && field.relationTo && (
                    <Select
                      id={`canvas-${field.name}`}
                      value={fieldVal ?? ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={isFieldRefining}
                    >
                      <option value="">-- Associate {field.relationTo}... --</option>
                      {(relationOptions[field.relationTo] || []).map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  )}

                  {/* Fallback for complex list field types in CMS (e.g. array, blocks) */}
                  {(field.type === 'array' || field.type === 'blocks') && (
                    <div className="space-y-2 p-3 bg-surface-container-low/30 border border-outline-variant/10 rounded-xl font-mono text-xs select-all text-on-surface-variant">
                      <span className="text-[10px] text-outline font-label uppercase font-bold block mb-1">Raw JSON Editor (List Field Structure)</span>
                      <textarea
                        value={typeof fieldVal === 'object' ? JSON.stringify(fieldVal, null, 2) : String(fieldVal)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value)
                            handleFieldChange(field.name, parsed)
                          } catch {
                            handleFieldChange(field.name, e.target.value)
                          }
                        }}
                        rows={4}
                        className="w-full bg-surface-container-lowest/60 rounded-lg border border-outline-variant/10 p-2 text-xs font-mono font-normal outline-none"
                      />
                    </div>
                  )}

                </div>
              </div>
            )
          })}
        </div>
      )}

    </Card>
  )
}
