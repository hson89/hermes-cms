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
import { CoCreationChat } from './CoCreationChat'

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

export const GeneratorView: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { id } = useDocumentInfo()
  const isEditMode = !!id

  if (isEditMode) {
    return <EditorView />
  }

  // Identity / Tenant state
  const [activeTenantId, setActiveTenantId] = useState<string>('')

  // Schema state
  const [contentTypeName, setContentTypeName] = useState('')
  const [contentTypeSlug, setContentTypeSlug] = useState('')
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // Interactive UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [availableCollections, setAvailableCollections] = useState<{ slug: string; label: string }[]>([])
  const [viewMode, setViewMode] = useState<'preview' | 'json'>('preview')
  
  // Dynamic Field Highlights for AI modifications
  const [highlightedFields, setHighlightedFields] = useState<Record<string, 'added' | 'modified'>>({})

  // Feedback notifications
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

  // Load available collections for relationship target fields dynamically
  useEffect(() => {
    fetch('/api/content-types/collections-list')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load collections')
        return res.json()
      })
      .then((data) => {
        if (data && data.collections) {
          setAvailableCollections(data.collections)
        }
      })
      .catch((err) => {
        console.error('Failed to load collections list:', err)
      })
  }, [])

  // Callback when AI generates or updates schema
  const handleSchemaGenerated = (newSchema: any) => {
    if (!newSchema) return

    // Set schema names if not already set
    if (newSchema.name && !contentTypeName) {
      setContentTypeName(newSchema.name)
      setContentTypeSlug(newSchema.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    }

    const incomingFields = newSchema.fields || []

    // Calculate AI modifications (added vs modified)
    const newHighlights: Record<string, 'added' | 'modified'> = {}
    incomingFields.forEach((newField: any) => {
      const oldField = fields.find((f) => f.name === newField.name)
      if (!oldField) {
        newHighlights[newField.name] = 'added'
      } else {
        const isModified =
          oldField.type !== newField.type ||
          oldField.label !== newField.label ||
          !!oldField.required !== !!newField.required ||
          !!oldField.unique !== !!newField.unique ||
          !!oldField.localized !== !!newField.localized ||
          JSON.stringify(oldField.options) !== JSON.stringify(newField.options) ||
          oldField.relationTo !== newField.relationTo

        if (isModified) {
          newHighlights[newField.name] = 'modified'
        }
      }
    })

    setHighlightedFields(newHighlights)
    setFields(incomingFields)

    // Clear highlights after 4 seconds
    setTimeout(() => {
      setHighlightedFields({})
    }, 4000)
  }

  // Add field manually
  const handleAddField = () => {
    const newField: FieldDefinition = {
      name: `field_${Date.now() % 1000}`,
      label: 'New Field',
      type: 'text',
      required: false,
      unique: false,
      description: '',
    }
    setFields([...fields, newField])
    setExpandedIndex(fields.length) // Expand the newly created field immediately
  }

  // Delete field manually
  const handleDeleteField = (index: number) => {
    const updatedFields = fields.filter((_, idx) => idx !== index)
    setFields(updatedFields)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  // Modify individual field attributes manually
  const handleUpdateField = (index: number, updates: Partial<FieldDefinition>) => {
    const updated = [...fields]
    updated[index] = { ...updated[index], ...updates }
    setFields(updated)
  }

  // Move field order up or down
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === fields.length - 1) return

    const updated = [...fields]
    const swapWithIndex = direction === 'up' ? index - 1 : index + 1
    const temp = updated[index]
    updated[index] = updated[swapWithIndex]
    updated[swapWithIndex] = temp
    
    setFields(updated)
    if (expandedIndex === index) {
      setExpandedIndex(swapWithIndex)
    } else if (expandedIndex === swapWithIndex) {
      setExpandedIndex(index)
    }
  }

  // Commit dynamic content type schema to CMS collection
  const handleApplySchema = async () => {
    if (!contentTypeName.trim()) {
      setErrorMsg('Content Type Name is required.')
      return
    }

    setIsApplying(true)
    setErrorMsg('')
    setSuccessMsg('')

    const generatedSchema = {
      name: contentTypeName,
      fields,
    }

    const payloadData = {
      name: contentTypeName,
      slug: contentTypeSlug || contentTypeName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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
          <Heading level={2} className="mt-1 font-serif text-2xl lg:text-3xl">
            AI Content Architect
          </Heading>
          <Text variant="small" className="mt-1 max-w-2xl text-outline">
            Describe your requirements to the AI architect companion on the right. You can simultaneously refine fields and add validations in the workspace canvas below.
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
        
        {/* Left Column (7 cols): Creator/Visual Fields Workspace */}
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
                  onChange: (e) => {
                    const val = (e.target as HTMLInputElement).value
                    setContentTypeName(val)
                    setContentTypeSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-'))
                  },
                  disabled: isApplying
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
                  disabled: isApplying
                }}
                placeholder="e.g. luxury-catalog"
                required
              />
            </div>
            
            <div className="pt-4 border-t border-outline-variant/10 flex flex-col sm:flex-row gap-3 justify-end select-none">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFields([])
                  setContentTypeName('')
                  setContentTypeSlug('')
                  setSessionId(null)
                }}
                disabled={isApplying}
                className="text-xs uppercase tracking-widest"
              >
                Reset Canvas
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
          </Card>

          {/* Visual Fields Canvas */}
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label text-xs uppercase tracking-wider text-outline font-bold">Fields Workspace</span>
              
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex gap-1 bg-surface-container-low/50 p-1 rounded-lg border border-outline-variant/10 select-none">
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`text-[9px] font-label font-bold uppercase tracking-widest px-2.5 py-1 rounded border-none cursor-pointer ${
                      viewMode === 'preview' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'bg-transparent text-outline'
                    }`}
                  >
                    Builder
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('json')}
                    className={`text-[9px] font-label font-bold uppercase tracking-widest px-2.5 py-1 rounded border-none cursor-pointer ${
                      viewMode === 'json' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'bg-transparent text-outline'
                    }`}
                  >
                    JSON
                  </button>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddField}
                  className="text-xs uppercase tracking-widest px-3 py-1 flex items-center gap-1.5 border border-outline-variant/30 hover:border-primary/50"
                >
                  <Icon name="add" size={14} /> Add Field
                </Button>
              </div>
            </div>

            {viewMode === 'json' ? (
              <div className="bg-neutral-900 text-neutral-200 rounded-xl p-4 font-mono text-xs overflow-auto max-h-[450px] shadow-inner select-all leading-relaxed whitespace-pre">
                {JSON.stringify({ name: contentTypeName, fields }, null, 2)}
              </div>
            ) : fields.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-lowest/30 flex flex-col items-center select-none">
                <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                  <Icon name="layers_clear" className="text-outline" size={24} />
                </div>
                <Heading level={4} className="text-sm font-semibold">Workspace Canvas Empty</Heading>
                <Text variant="small" className="mt-1 max-w-xs text-outline leading-snug">
                  Instruct the AI companion on the right to auto-generate the content layout, or click the Add Field button to create manually.
                </Text>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, idx) => {
                  const highlightType = highlightedFields[field.name]
                  const highlightClass = highlightType === 'added'
                    ? 'ring-2 ring-emerald-500/50 bg-emerald-500/[0.03] animate-pulse'
                    : highlightType === 'modified'
                    ? 'ring-2 ring-amber-500/50 bg-amber-500/[0.03] animate-pulse'
                    : ''

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border transition-all duration-300 overflow-hidden ${highlightClass} ${
                        expandedIndex === idx
                          ? 'border-primary/50 bg-surface-container-low shadow-md'
                          : 'border-outline-variant/15 bg-surface-container-lowest/40 hover:border-outline-variant/40 hover:bg-surface-container-low/20'
                      }`}
                    >
                      {/* Field item row header */}
                      <div
                        onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveField(idx, 'up')}
                              className="size-5 rounded hover:bg-surface-container-high flex items-center justify-center text-outline/60 hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <span className="material-symbols-outlined text-[10px] font-bold">arrow_upward</span>
                            </button>
                            <button
                              type="button"
                              disabled={idx === fields.length - 1}
                              onClick={() => handleMoveField(idx, 'down')}
                              className="size-5 rounded hover:bg-surface-container-high flex items-center justify-center text-outline/60 hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                            >
                              <span className="material-symbols-outlined text-[10px] font-bold">arrow_downward</span>
                            </button>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-sm font-semibold text-on-surface truncate">{field.label || 'Unnamed Field'}</span>
                            <span className="block font-mono text-[9px] text-outline font-medium tracking-wide">({field.name})</span>
                          </div>
                          
                          <div className="flex gap-1 flex-wrap">
                            {field.required && <Badge size="sm" variant="subtle" color="danger">Req</Badge>}
                            {field.unique && <Badge size="sm" variant="subtle" color="primary">Uniq</Badge>}
                            {field.localized && <Badge size="sm" variant="subtle" color="success">Loc</Badge>}
                            
                            {/* Dynamic AI change indicator badges */}
                            {highlightType === 'added' && (
                              <span className="visual-diff-badge text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                AI Added
                              </span>
                            )}
                            {highlightType === 'modified' && (
                              <span className="visual-diff-badge text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                AI Refined
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="bg-primary/5 text-primary font-label font-bold text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-md border border-primary/10">
                            {field.type}
                          </span>
                          <span className="material-symbols-outlined text-outline/60 text-lg transition-transform duration-300" style={{
                            transform: expandedIndex === idx ? 'rotate(180deg)' : 'rotate(0)'
                          }}>
                            expand_more
                          </span>
                        </div>
                      </div>

                      {/* Field customizer drawer */}
                      {expandedIndex === idx && (
                        <div className="p-5 border-t border-outline-variant/15 bg-surface-container-lowest space-y-4 animate-fade-slide-up">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              label="Field Label"
                              id={`label-${idx}`}
                              inputProps={{
                                value: field.label,
                                onChange: (e) => handleUpdateField(idx, { label: (e.target as HTMLInputElement).value })
                              }}
                            />

                            <FormField
                              label="Field Name (slug)"
                              id={`name-${idx}`}
                              inputProps={{
                                value: field.name,
                                onChange: (e) => handleUpdateField(idx, { name: (e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9_]/g, '') })
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                             <div className="space-y-1.5">
                              <Label htmlFor={`type-${idx}`}>Field Type</Label>
                              <select
                                id={`type-${idx}`}
                                value={field.type}
                                onChange={(e) => handleUpdateField(idx, { type: e.target.value as any })}
                                className="w-full bg-surface-container-low rounded-xl border border-outline-variant/15 outline-none p-3 font-body text-xs text-on-surface transition-all focus:border-primary/50"
                              >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                                <option value="select">Select Dropdown</option>
                                <option value="richText">Rich Text</option>
                                <option value="relationship">Relationship</option>
                                <option value="array">Array</option>
                                <option value="blocks">Blocks</option>
                              </select>
                            </div>

                            {/* Overrides options */}
                            <div className="flex gap-6 pb-2.5">
                              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-on-surface">
                                <input
                                  type="checkbox"
                                  checked={!!field.required}
                                  onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                                  className="rounded border-outline-variant/30 text-primary focus:ring-primary/20 accent-primary"
                                />
                                Required
                              </label>

                              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-on-surface">
                                <input
                                  type="checkbox"
                                  checked={!!field.unique}
                                  onChange={(e) => handleUpdateField(idx, { unique: e.target.checked })}
                                  className="rounded border-outline-variant/30 text-primary focus:ring-primary/20 accent-primary"
                                />
                                Unique
                              </label>

                              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-on-surface">
                                <input
                                  type="checkbox"
                                  checked={!!field.localized}
                                  onChange={(e) => handleUpdateField(idx, { localized: e.target.checked })}
                                  className="rounded border-outline-variant/30 text-primary focus:ring-primary/20 accent-primary"
                                />
                                Localized
                              </label>
                            </div>
                          </div>

                          {/* Select Dropdown options lists */}
                          {field.type === 'select' && (
                            <div className="space-y-1.5 animate-fade-slide-up">
                              <Label htmlFor={`options-${idx}`}>Dropdown Options (Comma separated list)</Label>
                              <input
                                type="text"
                                id={`options-${idx}`}
                                value={field.options?.join(', ') || ''}
                                onChange={(e) => handleUpdateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                placeholder="e.g. rolex, omega, patek"
                                className="w-full bg-surface-container-low rounded-xl border border-outline-variant/15 focus:border-primary/60 outline-none p-3 font-body text-xs text-on-surface placeholder-outline/40"
                              />
                            </div>
                          )}

                          {/* Relationship selection bounds */}
                          {field.type === 'relationship' && (
                            <div className="space-y-1.5 animate-fade-slide-up">
                              <Label htmlFor={`relation-${idx}`}>Relational Target</Label>
                              <select
                                id={`relation-${idx}`}
                                value={field.relationTo || ''}
                                onChange={(e) => handleUpdateField(idx, { relationTo: e.target.value })}
                                className="w-full bg-surface-container-low rounded-xl border border-outline-variant/15 outline-none p-3 font-body text-xs text-on-surface transition-all focus:border-primary/50"
                              >
                                <option value="">-- Select Target Collection --</option>
                                {availableCollections.map((col) => (
                                  <option key={col.slug} value={col.slug}>
                                    {col.label} ({col.slug})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <Label htmlFor={`desc-${idx}`}>Description</Label>
                            <input
                              type="text"
                              id={`desc-${idx}`}
                              value={field.description || ''}
                              onChange={(e) => handleUpdateField(idx, { description: e.target.value })}
                              placeholder="e.g. Unique serial designation engraved..."
                              className="w-full bg-surface-container-low rounded-xl border border-outline-variant/15 focus:border-primary/60 outline-none p-3 font-body text-xs text-on-surface placeholder-outline/40"
                            />
                          </div>

                          <div className="pt-3 border-t border-outline-variant/10 flex justify-end gap-2 select-none">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleDeleteField(idx)}
                              className="text-xs uppercase tracking-widest px-3 py-1.5 text-error hover:bg-error-container/10 flex items-center gap-1"
                            >
                              <Icon name="delete" size={14} /> Remove Field
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): AI Co-creation companion */}
        <div className="lg:col-span-5">
          <CoCreationChat
            sessionId={sessionId}
            onSessionIdChange={setSessionId}
            currentSchema={{ name: contentTypeName, fields }}
            onSchemaGenerated={handleSchemaGenerated}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        </div>

      </div>

    </div>
  )
}
