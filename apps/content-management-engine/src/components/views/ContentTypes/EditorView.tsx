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

export const EditorView: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { id } = useDocumentInfo()

  // Schema state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [originalSchema, setOriginalSchema] = useState<any | null>(null)
  const [hasContentItems, setHasContentItems] = useState(false)
  const [version, setVersion] = useState<string>('') // Optimistic concurrency tracking
  const [docVersion, setDocVersion] = useState<number>(1) // Optimistic integer version tracking
  const [availableCollections, setAvailableCollections] = useState<{ slug: string; label: string }[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Interactive UI state
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'preview' | 'json'>('preview')
  const [isGenerating, setIsGenerating] = useState(false)

  // Dynamic Field Highlights for AI modifications
  const [highlightedFields, setHighlightedFields] = useState<Record<string, 'added' | 'modified'>>({})

  // Status/feedback
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Load content type schema detail
  useEffect(() => {
    if (!id) return

    setIsLoading(true)
    setErrorMsg('')

    // Fetch ContentType document
    fetch(`/api/content-types/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch Content Type details')
        return res.json()
      })
      .then(async (data) => {
        if (data) {
          setName(data.name || '')
          setSlug(data.slug || '')
          setStatus(data.status || 'draft')
          setFields(data.schema?.fields || [])
          setOriginalSchema(data.originalSchema || null)
          setVersion(data.updatedAt || '')
          setDocVersion(data.version || 1)
          setSessionId(data.aiSessionId || null)

          // Query check if ContentItems exist for this content type to guard destructive editing
          try {
            const itemsRes = await fetch(`/api/content-items?where[contentType][equals]=${id}&limit=1`)
            if (itemsRes.ok) {
              const itemsData = await itemsRes.json()
              setHasContentItems(itemsData.docs?.length > 0)
            }
          } catch (e) {
            console.error('Failed to query content items count:', e)
          }
        }
        setIsLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setErrorMsg('Failed to load Content Type details.')
        setIsLoading(false)
      })
  }, [id])

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

    if (newSchema.name && !name) {
      setName(newSchema.name)
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

  // Save layout modification draft or publish
  const handleSaveSchema = async (targetStatus?: 'draft' | 'published') => {
    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const updatedStatus = targetStatus || status

    const payloadData: any = {
      name,
      slug,
      status: updatedStatus,
      schema: {
        name,
        fields,
      },
      originalSchema: {
        name,
        fields,
      },
      aiSessionId: sessionId || undefined,
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Attach concurrency verification timestamp to prevent multi-user overrides
      if (version) {
        headers['if-unmodified-since'] = version
      }
      if (docVersion) {
        headers['x-version'] = String(docVersion)
      }

      const res = await fetch(`/api/content-types/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payloadData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || data.error || 'Failed to update Content Type.')
      }

      // Update state timestamps, version & status
      setStatus(data.doc?.status || updatedStatus)
      if (data.doc?.updatedAt) {
        setVersion(data.doc.updatedAt)
      }
      if (data.doc?.version) {
        setDocVersion(data.doc.version)
      }

      // Update originalSchema baseline to match the newly accepted/saved state
      if (data.doc?.schema) {
        setOriginalSchema(data.doc.schema)
      } else {
        setOriginalSchema(payloadData.schema)
      }
      setHighlightedFields({})

      setSuccessMsg(
        targetStatus === 'published'
          ? 'Dynamic schema published and deployed successfully!'
          : 'Draft layout configurations saved successfully!'
      )

      setTimeout(() => {
        setSuccessMsg('')
      }, 3000)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  // Add field helper
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

  // Delete field helper
  const handleDeleteField = (index: number) => {
    const fieldToDelete = fields[index]

    // Destructive lock warning validation (matching hook rules)
    if (hasContentItems) {
      setErrorMsg(
        `Cannot delete field "${fieldToDelete.name}" because existing Content Items depend on this Content Type.`
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const updatedFields = fields.filter((_, idx) => idx !== index)
    setFields(updatedFields)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1)
    }
  }

  // Modify individual field attributes
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

  // Helper to determine visual diff status
  const getFieldDiffStatus = (field: FieldDefinition) => {
    if (!originalSchema?.fields || !Array.isArray(originalSchema.fields)) return null

    const origField = originalSchema.fields.find((f: any) => f.name === field.name)
    if (!origField) {
      return 'added'
    }

    const isModified =
      origField.type !== field.type ||
      origField.label !== field.label ||
      !!origField.required !== !!field.required ||
      !!origField.unique !== !!field.unique ||
      !!origField.localized !== !!field.localized ||
      origField.defaultValue !== field.defaultValue ||
      JSON.stringify(origField.options) !== JSON.stringify(field.options) ||
      origField.relationTo !== field.relationTo

    if (isModified) {
      return 'modified'
    }

    return 'unchanged'
  }

  // Calculate deleted AI suggested fields
  const getDeletedAIFields = () => {
    if (!originalSchema?.fields || !Array.isArray(originalSchema.fields)) return []
    return originalSchema.fields.filter(
      (origField: any) => !fields.some((f) => f.name === origField.name)
    )
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <span className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
        <Text variant="small" className="text-outline">Loading Content Type canvas layout...</Text>
      </div>
    )
  }

  return (
    <div className="custom-editor-view w-full max-w-7xl mx-auto px-4 py-8 lg:py-12 bg-surface-bright min-h-[85vh] font-body text-on-surface antialiased">
      
      {/* Visual Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant/15 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Visual Refiner</span>
            {status === 'published' ? (
              <Badge color="success" size="sm">Published</Badge>
            ) : (
              <Badge color="warning" size="sm">Draft</Badge>
            )}
          </div>
          <Heading level={2} className="mt-1 font-serif text-2xl lg:text-3xl text-on-surface">
            {name || 'Refine Schema'}
          </Heading>
          <Text variant="small" className="mt-1 text-outline max-w-2xl">
            Fine-tune constraints, validation parameters, selection dropdown arrays, and relationship targets.
          </Text>
        </div>

        <div className="flex gap-2 select-none">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/collections/content-types')}
            className="uppercase tracking-widest text-xs"
          >
            <Icon name="arrow_back" size={16} />
            Back
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSaveSchema('draft')}
            disabled={isSaving}
            className="uppercase tracking-widest text-xs"
          >
            Save Draft
          </Button>

          <Button
            type="button"
            onClick={() => handleSaveSchema('published')}
            disabled={isSaving}
            className="uppercase tracking-widest text-xs"
          >
            Deploy &amp; Publish
            <Icon name="publish" size={16} />
          </Button>

          {id && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.open(`/api/content-types/${id}/export`)}
                className="uppercase tracking-widest text-xs px-2.5"
                title="Export schema config as a standard JSON file"
              >
                <Icon name="download" size={16} />
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => window.open(`/api/content-types/${id}/export/ts`)}
                className="uppercase tracking-widest text-xs px-2.5"
                title="Export static Payload CMS TypeScript collection configuration definition"
              >
                <Icon name="code" size={16} />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Alerts */}
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

      {hasContentItems && (
        <div className="mb-6 p-4 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-3 border border-amber-500/20">
          <Icon name="warning" className="text-amber-600" />
          <span className="text-xs font-medium leading-relaxed">
            <strong>Destructive Lock Active:</strong> Existing Content Items are stored for this Content Type. Field deletions are blocked, and new required fields must specify fallbacks to preserve relational stability.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Workspace (7 cols): Fields Canvas List */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="low" className="border border-outline-variant/15 p-6 shadow-xl shadow-on-surface/5 space-y-4">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
              <Icon name="settings" className="text-primary" />
              <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">General Configurations</span>
            </div>

            <FormField
              label="Content Type Name"
              id="ct-name"
              inputProps={{
                value: name,
                onChange: (e) => setName((e.target as HTMLInputElement).value),
              }}
              required
            />

            <FormField
              label="Content Type Slug"
              id="ct-slug"
              inputProps={{
                value: slug,
                onChange: (e) => setSlug((e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, '')),
                disabled: true, // Slugs should remain stable once generated
              }}
              required
            />
          </Card>

          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label text-xs uppercase tracking-wider text-outline font-bold">Fields Blueprint</span>
              
              <div className="flex items-center gap-3">
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
                {JSON.stringify({ name, fields }, null, 2)}
              </div>
            ) : fields.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-lowest/30 flex flex-col items-center">
                <Icon name="layers_clear" className="text-outline/50 mb-3" size={32} />
                <p className="text-sm text-outline font-medium">No fields configured. Click Add Field above to begin visual creation.</p>
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
                            
                            {/* Visual Diff Badges */}
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
                            {!highlightType && getFieldDiffStatus(field) === 'added' && (
                              <span className="visual-diff-badge text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20">
                                Added
                              </span>
                            )}
                            {!highlightType && getFieldDiffStatus(field) === 'modified' && (
                              <span className="visual-diff-badge text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                Modified
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
                            <div className="flex gap-6 pb-2.5 font-semibold text-xs text-on-surface select-none">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!field.required}
                                  onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                                  className="rounded border-outline-variant/30 text-primary focus:ring-primary/20 accent-primary"
                                />
                                Required
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!field.unique}
                                  onChange={(e) => handleUpdateField(idx, { unique: e.target.checked })}
                                  className="rounded border-outline-variant/30 text-primary focus:ring-primary/20 accent-primary"
                                />
                                Unique
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
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

          {/* Collapsible Audit Log for Removed AI-Suggested Fields */}
          {getDeletedAIFields().length > 0 && (
            <div className="removed-ai-fields-panel mt-6 p-5 rounded-2xl border border-dashed border-red-500/20 bg-red-500/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Icon name="history_toggle_off" size={16} />
                  <span className="font-label text-xs font-bold uppercase tracking-widest">Removed AI Suggestions</span>
                </div>
                <Badge color="danger" size="sm">
                  {getDeletedAIFields().length} deleted
                </Badge>
              </div>
              <p className="text-xs text-outline mb-3 leading-relaxed">
                The dynamic schema was modified from its original AI suggestion. The following fields were deleted:
              </p>
              <div className="space-y-2">
                {getDeletedAIFields().map((delField: any, delIdx: number) => (
                  <div key={delIdx} className="flex justify-between items-center bg-red-500/[0.04] px-3.5 py-2 rounded-xl border border-red-500/10 font-mono text-[10px]">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-red-600 dark:text-red-400">{delField.label}</span>
                      <span className="block text-[8px] text-outline">({delField.name})</span>
                    </div>
                    <span className="bg-red-500/10 text-red-700 dark:text-red-300 font-label font-bold text-[8px] uppercase tracking-widest px-2 py-0.5 rounded border border-red-500/10">
                      {delField.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): AI Co-creation Companion */}
        <div className="lg:col-span-5">
          <CoCreationChat
            sessionId={sessionId}
            onSessionIdChange={setSessionId}
            currentSchema={{ name, fields }}
            onSchemaGenerated={handleSchemaGenerated}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        </div>

      </div>

    </div>
  )
}
