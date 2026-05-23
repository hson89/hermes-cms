'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '../atoms/Badge'
import { Icon } from '../atoms/Icon'
import { Heading } from '../atoms/Heading'
import { Label } from '../atoms/Label'
import { FieldRenderer } from '../molecules/FieldRenderer'
import { FloatingAIBar } from '../molecules/FloatingAIBar'

export interface EditorPanelProps {
  draftData: any
  draftingFields?: Set<string>
  schema: any
  onSave?: (data: any) => void
  onRefine?: (prompt: string) => void
  styleModifiers?: any[]
  selectedStyle?: string | null
  onStyleChange?: (id: string | null) => void
  onPromote?: () => void
  tenantId?: string | number
  
  // Field Actions
  onRefineField?: (fieldName: string, instruction: string) => void
  onRegenerateField?: (fieldName: string) => void
  
  // Session / AI Controls
  isAiPaused?: boolean
  onPauseToggle?: (paused: boolean) => void

  // Lifted Versions / History Actions
  versions?: Array<{ timestamp: Date; label: string; data: any }>
  onViewHistoryToggle?: () => void
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
  draftData, 
  draftingFields = new Set(),
  schema, 
  onSave, 
  onRefine, 
  styleModifiers = [], 
  selectedStyle = null, 
  onStyleChange,
  onPromote,
  tenantId,
  
  onRefineField,
  onRegenerateField,
  isAiPaused = false,
  onPauseToggle,
  versions = [],
  onViewHistoryToggle
}) => {
  const normalizeDraftData = React.useCallback((rawDraft: any, currentSchema: any[]) => {
    if (!rawDraft || typeof rawDraft !== 'object' || !currentSchema || !Array.isArray(currentSchema)) {
      return rawDraft
    }
    const normalized: any = { ...rawDraft }
    currentSchema.forEach((field: any) => {
      if (!field?.name) return
      const fieldNameLower = field.name.toLowerCase()
      const matchingKey = Object.keys(rawDraft).find(k => k.toLowerCase() === fieldNameLower)
      if (matchingKey && matchingKey !== field.name) {
        normalized[field.name] = rawDraft[matchingKey]
        delete normalized[matchingKey]
      }
    })
    return normalized
  }, [])

  const getCaseInsensitiveVal = React.useCallback((obj: any, key: string) => {
    if (!obj || typeof obj !== 'object') return undefined
    const lowercaseKey = key.toLowerCase()
    const matchingKey = Object.keys(obj).find(k => k.toLowerCase() === lowercaseKey)
    return matchingKey ? obj[matchingKey] : undefined
  }, [])

  const [data, setData] = useState(() => normalizeDraftData(draftData, schema))
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())
  
  // Field-level states
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set())
  const [activeInlinePrompt, setActiveInlinePrompt] = useState<string | null>(null)
  const [inlinePrompts, setInlinePrompts] = useState<Record<string, string>>({})
  
  // Version / History States
  const [showVersionsDropdown, setShowVersionsDropdown] = useState(false)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)

  useEffect(() => {
    setData(normalizeDraftData(draftData, schema))
  }, [draftData, schema, normalizeDraftData])

  const handleChange = React.useCallback((name: string, value: any) => {
    const lowercaseName = name.toLowerCase()
    setData((prev: any) => {
      const matchingKey = Object.keys(prev).find(k => k.toLowerCase() === lowercaseName) || name
      const newData = { ...prev, [matchingKey]: value }
      if (onSave) {
        setTimeout(() => {
          onSave(newData)
        }, 0)
      }
      return newData
    })
    setModifiedFields(prev => new Set(prev).add(name))
  }, [onSave])

  const handleToggleApprove = (fieldName: string) => {
    setApprovedFields(prev => {
      const next = new Set(prev)
      if (next.has(fieldName)) {
        next.delete(fieldName)
      } else {
        next.add(fieldName)
      }
      return next
    })
  }

  const handleResetDraft = () => {
    if (versions.length > 0) {
      const initial = versions[0].data
      setData(initial)
      onSave?.(initial)
    } else {
      setData(draftData)
      onSave?.(draftData)
    }
    setShowMoreDropdown(false)
  }

  const handleExportMarkdown = () => {
    let md = `# AI Refined Draft\n\n`
    md += `*Generated via Hermes AI on ${new Date().toLocaleDateString()}*\n\n`
    md += `----\n\n`
    
    schema.forEach((field: any) => {
      const val = getCaseInsensitiveVal(data, field.name)
      md += `## ${field.label || field.name}\n`
      if (typeof val === 'object' && val !== null) {
        md += `\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\`\n\n`
      } else {
        md += `${val || '_No content generated._'}\n\n`
      }
    })

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'hermes_draft_export.md')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowMoreDropdown(false)
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'hermes_draft_export.json')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowMoreDropdown(false)
  }

  const activeStyle = styleModifiers.find(s => s.id === selectedStyle)

  if (!schema || schema.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-outline-variant text-3xl">schema</span>
        </div>
        <h3 className="font-headline text-xl font-bold text-on-surface mb-2">No Schema Defined</h3>
        <p className="font-body text-on-surface-variant max-w-sm">
          Please describe what you want to create so the AI can suggest a content structure.
        </p>
      </div>
    )
  }

  const coverArtField = schema.find((f: any) => f.name?.toLowerCase() === 'coverart' || f.name?.toLowerCase() === 'cover_art' || f.type === 'upload')
  const titleField = schema.find((f: any) => f.name?.toLowerCase() === 'title')
  const hasMetaFields = schema.some((f: any) => f.name?.toLowerCase() === 'slug' || f.name?.toLowerCase() === 'author')

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Dynamic Style Stylesheet for Drop Caps and Progress animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .editorial-drop-cap .ProseMirror > p:first-of-type::first-letter,
        .editorial-drop-cap .typing-cursor > p:first-of-type::first-letter {
          float: left;
          font-family: 'Noto Serif', Georgia, serif;
          font-size: 3.5rem;
          line-height: 3rem;
          padding-top: 4px;
          padding-right: 8px;
          padding-left: 3px;
          font-weight: bold;
          color: #6d5e00; /* Archival Gold */
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />

      {/* Editor Canvas Header */}
      <div className="mb-2">
        {/* Status badges row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 font-label">
              Archival Mode
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border font-label ${
              isAiPaused
                ? 'bg-surface-container-high text-on-surface-variant border-outline-variant/15'
                : 'bg-surface-container-lowest border-outline-variant/15 text-on-surface-variant'
            }`}>
              <span className="material-symbols-outlined text-xs text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isAiPaused ? 'pause' : 'bolt'}
              </span>
              {isAiPaused ? 'AI Paused' : 'AI Agent Active'}
            </span>
          </div>

          <button
            onClick={onViewHistoryToggle}
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer border-none bg-transparent font-body"
          >
            <span className="material-symbols-outlined text-base">history</span>
            View History
          </button>
        </div>

        {/* Page title */}
        <h1 className="font-headline text-5xl font-bold text-on-surface tracking-tight mb-3 leading-tight">
          The Content Oracle
        </h1>
        <p className="text-on-surface-variant text-base font-body leading-relaxed">
          Interactive, AI-orchestrated editorial workshop. Edit schema-driven fields below or guide style refinements via the assistant companion.
        </p>
      </div>

      {/* Meta Fields Side-by-Side Flex Layout */}
      {hasMetaFields && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schema
            .filter((f: any) => f.name?.toLowerCase() === 'slug' || f.name?.toLowerCase() === 'author')
            .map((field: any) => {
              const isDrafting = draftingFields.has(field.name)
              const isModified = modifiedFields.has(field.name)
              const isApproved = approvedFields.has(field.name)
              return (
                <div key={field.name} className="group flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest font-label">
                      {field.label || field.name}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {isModified && <Badge isNew={isModified} />}
                      <button
                        onClick={() => handleToggleApprove(field.name)}
                        className={`size-6 rounded-md flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors ${
                          isApproved ? 'text-primary' : 'text-outline hover:text-primary'
                        }`}
                      >
                        <Icon name={isApproved ? "check_circle" : "circle"} size={14} />
                      </button>
                    </div>
                  </div>
                  <FieldRenderer
                    field={field}
                    value={getCaseInsensitiveVal(data, field.name)}
                    isDrafting={isDrafting}
                    disabled={isApproved}
                    tenantId={tenantId}
                    onChange={(val) => handleChange(field.name, val)}
                  />
                </div>
              )
            })}
        </div>
      )}

      {/* Title Field — large borderless serif input */}
      {titleField && (() => {
        const field = titleField
        const isDrafting = draftingFields.has(field.name)
        const isModified = modifiedFields.has(field.name)
        const isApproved = approvedFields.has(field.name)
        const isInlineActive = activeInlinePrompt === field.name

        return (
          <div className="group/title flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest font-label">
                {field.label || field.name}
              </label>
              <div className="flex items-center gap-2">
                {isModified && <Badge isNew={isModified} />}
                <button
                  onClick={() => !isAiPaused && !isApproved && setActiveInlinePrompt(prev => prev === field.name ? null : field.name)}
                  disabled={isAiPaused || isApproved}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest border border-outline-variant/15 text-xs font-medium font-body hover:bg-surface-container-low transition-colors cursor-pointer border-solid disabled:opacity-40 disabled:cursor-not-allowed ${
                    isInlineActive ? 'text-primary border-primary/15' : 'text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs text-outline">auto_awesome</span>
                  Refine
                </button>
              </div>
            </div>

            {/* Inline refinement prompt */}
            {isInlineActive && (
              <div className="flex gap-2 p-3 bg-surface-container-lowest/80 backdrop-blur-[10px] rounded-xl border border-outline-variant/15 animate-in fade-in duration-300">
                <input
                  type="text"
                  placeholder="Instruct the AI to refine this title..."
                  value={inlinePrompts[field.name] || ''}
                  onChange={(e) => setInlinePrompts(prev => ({ ...prev, [field.name]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const p = inlinePrompts[field.name]?.trim()
                      if (p) { onRefineField?.(field.name, p); setActiveInlinePrompt(null) }
                    }
                  }}
                  className="flex-1 bg-surface-container-low/50 border border-outline-variant/15 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-body"
                />
                <button
                  onClick={() => { const p = inlinePrompts[field.name]?.trim(); if (p) { onRefineField?.(field.name, p); setActiveInlinePrompt(null) } }}
                  className="bg-primary text-on-primary px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none"
                >Refine</button>
                <button
                  onClick={() => setActiveInlinePrompt(null)}
                  className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none"
                >Cancel</button>
              </div>
            )}

            {/* Title rendered as large borderless serif input */}
            <FieldRenderer
              field={{ ...field, titleStyle: true }}
              value={getCaseInsensitiveVal(data, field.name)}
              isDrafting={isDrafting}
              disabled={isApproved}
              tenantId={tenantId}
              onChange={(val) => handleChange(field.name, val)}
            />
          </div>
        )
      })()}

      {/* Featured Image / Cover Art */}
      {coverArtField && (() => {
        const field = coverArtField
        const isDrafting = draftingFields.has(field.name)
        const isApproved = approvedFields.has(field.name)

        return (
          <div className="flex flex-col gap-3">
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest font-label">
              {field.label || 'Featured Image'}
            </label>

            <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/15 group/cover">
              {isDrafting ? (
                <div className="flex justify-center px-6 pt-12 pb-16 relative">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center z-10 px-8 text-center gap-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary animate-pulse text-4xl">image_search</span>
                      <span className="font-label text-sm text-white font-bold tracking-wide">Generating Artistic Cover Frame...</span>
                      <span className="text-[10px] text-zinc-300 font-body max-w-md">Orchestrating visual parameters to match editorial content tone.</span>
                    </div>
                    <div className="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-container animate-[loading-bar_2s_infinite_linear] w-[70%]" />
                    </div>
                  </div>
                  <div className="h-40" />
                </div>
              ) : getCaseInsensitiveVal(data, field.name) ? (
                <div className="relative w-full aspect-[21/9]">
                  <img
                    src={typeof getCaseInsensitiveVal(data, field.name) === 'string'
                      ? getCaseInsensitiveVal(data, field.name)
                      : (getCaseInsensitiveVal(data, field.name)?.url || '')}
                    alt="Featured Image"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-[1.02]"
                  />
                  {!isApproved && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => onRegenerateField?.(field.name)}
                        className="bg-white/95 backdrop-blur text-on-surface px-4 py-2 rounded-xl font-label text-xs font-bold border-none cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] transition-all"
                      >
                        <Icon name="refresh" size={14} />
                        Regenerate Frame
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state — matches new design */
                <div className="flex justify-center px-6 pt-12 pb-16 border-2 border-outline-variant/15 border-dashed rounded-2xl bg-surface-container-lowest/50 hover:bg-surface-container-low/50 transition-colors relative overflow-hidden group-hover/cover:border-primary/30">
                  <div className="space-y-4 text-center z-10 relative">
                    <div className="mx-auto h-12 w-12 text-outline-variant flex items-center justify-center">
                      <svg aria-hidden="true" className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface uppercase tracking-wider font-label">Cover Frame Empty</p>
                      <p className="text-xs text-on-surface-variant mt-1 font-body">AI cover visualizer will load once narrative tone is synthesized.</p>
                    </div>
                    <button
                      onClick={() => onRegenerateField?.(field.name)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-outline-variant/15 text-sm font-medium rounded-lg text-on-surface bg-surface-container-lowest hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30 mt-4 transition-all cursor-pointer font-body"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">auto_awesome</span>
                      Generate Artwork
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Remaining Schema Fields */}
      <div className="flex flex-col gap-10 pb-24">
        {!isAiPaused && <FloatingAIBar onRefine={onRefine || (() => {})} />}

        {schema
          .filter((field: any) =>
            field.name?.toLowerCase() !== 'title' &&
            field.name?.toLowerCase() !== 'slug' &&
            field.name?.toLowerCase() !== 'author' &&
            field.name?.toLowerCase() !== coverArtField?.name?.toLowerCase()
          )
          .map((field: any) => {
            const isDrafting = draftingFields.has(field.name)
            const isModified = modifiedFields.has(field.name)
            const isApproved = approvedFields.has(field.name)
            const isInlineActive = activeInlinePrompt === field.name
            const isBody = field.name === 'body' || field.type === 'richText'

            return (
              <div
                key={field.name}
                className={`group transition-all duration-300 ${
                  isApproved ? 'p-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest/50' : ''
                }`}
              >
                {/* Field header */}
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-xs font-semibold uppercase tracking-widest font-label flex items-center gap-2 ${
                    isApproved ? 'text-primary' : 'text-on-surface-variant group-focus-within:text-primary transition-colors'
                  }`}>
                    {field.label || field.name}
                    {isApproved && (
                      <span className="inline-flex items-center gap-0.5 bg-primary/8 text-primary px-2 py-0.5 rounded-full border border-primary/15 text-[8px] font-bold font-label uppercase select-none">
                        <Icon name="lock" size={10} />
                        Approved
                      </span>
                    )}
                  </label>

                  <div className="flex items-center gap-2">
                    {isModified && <Badge isNew={isModified} />}
                    <div className="flex items-center gap-0.5 bg-surface-container-high/40 rounded-lg p-0.5 border border-outline-variant/15 select-none">
                      {/* Inline refinement */}
                      <button
                        onClick={() => !isAiPaused && !isApproved && setActiveInlinePrompt(prev => prev === field.name ? null : field.name)}
                        disabled={isAiPaused || isApproved}
                        title="Inline Refinement"
                        className={`size-7 rounded-md flex items-center justify-center border-none bg-transparent transition-all ${
                          isAiPaused || isApproved
                            ? 'opacity-40 cursor-not-allowed text-outline'
                            : isInlineActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-outline hover:text-primary hover:bg-surface-container-high cursor-pointer'
                        }`}
                      >
                        <Icon name="edit_note" size={16} />
                      </button>
                      {/* Approve */}
                      <button
                        onClick={() => handleToggleApprove(field.name)}
                        title={isApproved ? "Unlock Field" : "Approve Field"}
                        className={`size-7 rounded-md flex items-center justify-center border-none bg-transparent cursor-pointer transition-all ${
                          isApproved ? 'text-primary hover:bg-primary/10' : 'text-outline hover:text-primary hover:bg-surface-container-high'
                        }`}
                      >
                        <Icon name={isApproved ? 'check_circle' : 'circle'} size={14} />
                      </button>
                      {/* Regenerate */}
                      <button
                        onClick={() => !isAiPaused && !isApproved && onRegenerateField?.(field.name)}
                        disabled={isAiPaused || isApproved || isDrafting}
                        title="Regenerate field"
                        className={`size-7 rounded-md flex items-center justify-center border-none bg-transparent transition-all ${
                          isAiPaused || isApproved || isDrafting
                            ? 'opacity-40 cursor-not-allowed text-outline'
                            : 'text-outline hover:text-error hover:bg-surface-container-high cursor-pointer'
                        }`}
                      >
                        <Icon name="refresh" size={14} className={isDrafting ? 'animate-spin text-primary' : ''} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline refinement prompt box */}
                {isInlineActive && (
                  <div className="flex gap-2 p-3 mb-3 bg-surface-container-lowest/80 backdrop-blur-[10px] rounded-xl border border-outline-variant/15 animate-in fade-in duration-300">
                    <input
                      type="text"
                      placeholder={`Refine '${field.label || field.name}'...`}
                      value={inlinePrompts[field.name] || ''}
                      onChange={(e) => setInlinePrompts(prev => ({ ...prev, [field.name]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const p = inlinePrompts[field.name]?.trim()
                          if (p) { onRefineField?.(field.name, p); setActiveInlinePrompt(null) }
                        }
                      }}
                      className="flex-1 bg-surface-container-low/50 border border-outline-variant/15 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-body"
                    />
                    <button
                      onClick={() => { const p = inlinePrompts[field.name]?.trim(); if (p) { onRefineField?.(field.name, p); setActiveInlinePrompt(null) } }}
                      className="bg-primary text-on-primary px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none hover:opacity-95"
                    >Refine</button>
                    <button
                      onClick={() => setActiveInlinePrompt(null)}
                      className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none"
                    >Cancel</button>
                  </div>
                )}

                <div className={isBody ? "editorial-drop-cap prose prose-lg font-serif" : ""}>
                  <FieldRenderer
                    field={field}
                    value={getCaseInsensitiveVal(data, field.name)}
                    isDrafting={isDrafting}
                    disabled={isApproved}
                    tenantId={tenantId}
                    onChange={(val) => handleChange(field.name, val)}
                  />
                </div>
              </div>
            )
          })}
      </div>

      {/* Floating Rich-Text Toolbar — fixed bottom center, matches new design */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/15 rounded-full px-4 py-2 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-3 duration-500">
        {/* Text formatting */}
        <button type="button" onClick={() => document.execCommand('bold')} title="Bold" className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border-none bg-transparent cursor-pointer w-8 h-8 flex items-center justify-center font-serif font-bold text-sm">B</button>
        <button type="button" onClick={() => document.execCommand('italic')} title="Italic" className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border-none bg-transparent cursor-pointer w-8 h-8 flex items-center justify-center font-serif italic text-sm">I</button>
        <button type="button" onClick={() => document.execCommand('underline')} title="Underline" className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border-none bg-transparent cursor-pointer w-8 h-8 flex items-center justify-center underline text-sm font-body">U</button>

        <div className="w-px h-4 bg-outline-variant/15 mx-1" />

        <button type="button" onClick={() => document.execCommand('formatBlock', false, '<h2>')} title="Heading 2" className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border-none bg-transparent cursor-pointer w-8 h-8 flex items-center justify-center font-semibold text-xs font-body">H2</button>
        <button type="button" onClick={() => document.execCommand('formatBlock', false, '<h3>')} title="Heading 3" className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border-none bg-transparent cursor-pointer w-8 h-8 flex items-center justify-center font-semibold text-xs font-body">H3</button>

        <div className="w-px h-4 bg-outline-variant/15 mx-1" />

        <button type="button" onClick={() => document.execCommand('insertUnorderedList')} title="List" className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border-none bg-transparent cursor-pointer w-8 h-8 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
        </button>
        <button type="button" onClick={() => document.execCommand('formatBlock', false, '<blockquote>')} title="Quote" className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container-high rounded-md transition-colors border-none bg-transparent cursor-pointer w-8 h-8 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
        </button>

        <div className="w-px h-4 bg-outline-variant/15 mx-1" />

        {/* AI Enhance button */}
        <button
          onClick={() => {
            const promptStr = prompt("Describe how you would like to refine the overall draft:")
            if (promptStr?.trim()) onRefine?.(promptStr)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-full hover:bg-primary/90 transition-colors ml-1 border-none cursor-pointer font-label"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
          Enhance
        </button>
      </div>
    </div>
  )
}
