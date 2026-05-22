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
      onSave?.(newData)
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

      {/* Premium Editorial Header */}
      <div className="flex flex-col gap-5 border-b border-outline-variant/15 pb-6 select-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge color="gold" size="sm">Archival Mode</Badge>
            <Badge color={isAiPaused ? "neutral" : "success"} size="sm" icon={isAiPaused ? "pause" : "smart_toy"}>
              {isAiPaused ? "AI PAUSED" : "AI AGENT ACTIVE"}
            </Badge>
          </div>
          
          <button 
            onClick={onViewHistoryToggle}
            className="flex items-center gap-1.5 text-xs font-label text-outline hover:text-primary transition-colors cursor-pointer border-none bg-transparent"
          >
            <Icon name="history" size={14} />
            <span>View History</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Heading level={2} className="font-serif tracking-tight text-on-surface m-0">
            The Content Oracle
          </Heading>
          <span className="block text-xs font-body text-outline leading-relaxed">
            Interactive, AI-orchestrated editorial workshop. Edit schema-driven fields below or guide style refinements via the assistant companion.
          </span>
        </div>
      </div>

      {/* Meta Fields Side-by-Side Flex Layout */}
      {hasMetaFields && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container-lowest/50 p-6 rounded-2xl border border-outline-variant/15">
          {schema
            .filter((f: any) => f.name?.toLowerCase() === 'slug' || f.name?.toLowerCase() === 'author')
            .map((field: any) => {
              const isDrafting = draftingFields.has(field.name)
              const isModified = modifiedFields.has(field.name)
              const isApproved = approvedFields.has(field.name)
              return (
                <div key={field.name} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] uppercase tracking-widest text-outline">
                      {field.label || field.name}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Badge isNew={isModified} />
                      <button 
                        onClick={() => handleToggleApprove(field.name)}
                        className={`size-6 rounded-md flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors ${
                          isApproved ? 'text-success' : 'text-outline hover:text-primary'
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

      {/* Premium Editorial Title Area */}
      {titleField && (() => {
        const field = titleField
        const isDrafting = draftingFields.has(field.name)
        const isModified = modifiedFields.has(field.name)
        const isApproved = approvedFields.has(field.name)
        const isInlineActive = activeInlinePrompt === field.name
        
        return (
          <div className="relative group/title flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] uppercase tracking-widest text-outline">
                {field.label || field.name}
              </Label>
              <div className="flex items-center gap-2">
                <Badge isNew={isModified} />
                <button
                  onClick={() => !isAiPaused && !isApproved && setActiveInlinePrompt(prev => prev === field.name ? null : field.name)}
                  disabled={isAiPaused || isApproved}
                  className={`flex items-center gap-1 text-[10px] font-label font-bold uppercase border-none bg-transparent cursor-pointer transition-all ${
                    isInlineActive ? 'text-primary' : 'text-outline hover:text-primary'
                  }`}
                >
                  <Icon name="auto_awesome" size={12} className={isInlineActive ? "text-primary" : "text-outline"} />
                  <span>Refine</span>
                </button>
              </div>
            </div>

            {/* Inline Title prompt refinement */}
            {isInlineActive && (
              <div className="flex gap-2 p-3 bg-surface-container-lowest/80 backdrop-blur-[10px] rounded-xl border border-outline-variant/15 shadow-sm animate-in fade-in duration-300">
                <input 
                  type="text"
                  placeholder="Instruct the AI to refine this title specifically..."
                  value={inlinePrompts[field.name] || ''}
                  onChange={(e) => setInlinePrompts(prev => ({ ...prev, [field.name]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const prompt = inlinePrompts[field.name]?.trim()
                      if (prompt) {
                        onRefineField?.(field.name, prompt)
                        setActiveInlinePrompt(null)
                      }
                    }
                  }}
                  className="flex-1 bg-surface-container-low/50 border border-outline-variant/15 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-body"
                />
                <button
                  onClick={() => {
                    const prompt = inlinePrompts[field.name]?.trim()
                    if (prompt) {
                      onRefineField?.(field.name, prompt)
                      setActiveInlinePrompt(null)
                    }
                  }}
                  className="bg-primary text-on-primary px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none shadow-sm"
                >
                  Refine
                </button>
                <button
                  onClick={() => setActiveInlinePrompt(null)}
                  className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="relative">
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
      })()}

      {/* Premium Cover Art Generation Card */}
      {coverArtField && (() => {
        const field = coverArtField
        const isDrafting = draftingFields.has(field.name)
        const isModified = modifiedFields.has(field.name)
        const isApproved = approvedFields.has(field.name)
        
        return (
          <div className="flex flex-col gap-3">
            <Label className="text-[10px] uppercase tracking-widest text-outline">
              {field.label || 'Cover Art'}
            </Label>
            
            <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/15 group/cover">
              {isDrafting ? (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center z-10 px-8 text-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <Icon name="image_search" className="text-primary animate-pulse !text-4xl" />
                    <span className="font-label text-sm text-white font-bold tracking-wide">
                      Generating Artistic Cover Frame...
                    </span>
                    <span className="text-[10px] text-zinc-300 font-body max-w-md">
                      Orchestrating visual parameters to match editorial content tone.
                    </span>
                  </div>
                  {/* Active Animated Progress Bar */}
                  <div className="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary-container animate-[loading-bar_2s_infinite_linear] w-[70%]" />
                  </div>
                </div>
              ) : getCaseInsensitiveVal(data, field.name) ? (
                <div className="relative w-full h-full">
                  <img 
                    src={typeof getCaseInsensitiveVal(data, field.name) === 'string' ? getCaseInsensitiveVal(data, field.name) : (getCaseInsensitiveVal(data, field.name)?.url || '')} 
                    alt="Cover Art" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-[1.03]"
                  />
                  {!isApproved && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => onRegenerateField?.(field.name)}
                        className="bg-white/95 backdrop-blur text-on-surface px-4 py-2 rounded-xl font-label text-xs font-bold border-none cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <Icon name="refresh" size={14} />
                        <span>Regenerate Frame</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 gap-2.5">
                  <Icon name="image" size={36} className="text-outline-variant" />
                  <div className="text-center">
                    <span className="block font-label text-xs text-outline font-bold uppercase tracking-wider">Cover Frame Empty</span>
                    <span className="block text-[10px] text-outline-variant font-body mt-1">AI cover visualizer will load once narrative tone is synthesized.</span>
                  </div>
                  <button
                    onClick={() => onRegenerateField?.(field.name)}
                    className="bg-surface-container-high hover:bg-surface-variant text-primary px-4 py-2 rounded-xl font-label text-xs font-bold border border-outline-variant/15 cursor-pointer mt-2 flex items-center gap-1.5 transition-all"
                  >
                    <Icon name="auto_awesome" size={14} />
                    <span>Generate Artwork</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Other Form Fields */}
      <div className="flex flex-col gap-10">
        {!isAiPaused && <FloatingAIBar onRefine={onRefine || (() => {})} />}
        
        {schema
          .filter((field: any) => field.name?.toLowerCase() !== 'title' && field.name?.toLowerCase() !== 'slug' && field.name?.toLowerCase() !== 'author' && field.name?.toLowerCase() !== coverArtField?.name?.toLowerCase())
          .map((field: any) => {
            const isDrafting = draftingFields.has(field.name)
            const isModified = modifiedFields.has(field.name)
            const isApproved = approvedFields.has(field.name)
            const isInlineActive = activeInlinePrompt === field.name
            const isBody = field.name === 'body' || field.type === 'richText'
            
            return (
              <div 
                key={field.name} 
                className={`group transition-all duration-300 p-4 rounded-2xl border ${
                  isApproved 
                    ? 'border-tertiary/20 bg-tertiary-container/5 shadow-inner' 
                    : 'border-transparent'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-colors flex items-center gap-2">
                    {field.label || field.name}
                    {isApproved && (
                      <span className="flex items-center gap-0.5 bg-tertiary-container/30 text-tertiary px-2 py-0.5 rounded-full border border-tertiary/20 text-[8px] font-bold font-label uppercase select-none">
                        <Icon name="lock" size={10} />
                        Approved
                      </span>
                    )}
                  </Label>
                  
                  <div className="flex items-center gap-3">
                    <Badge isNew={isModified} />
                    <div className="flex items-center gap-1 bg-surface-container-high/40 rounded-lg p-0.5 border border-outline-variant/10 select-none">
                      {/* edit_note (Inline Field-Level Prompt) */}
                      <button 
                        onClick={() => !isAiPaused && !isApproved && setActiveInlinePrompt(prev => prev === field.name ? null : field.name)}
                        disabled={isAiPaused || isApproved}
                        title="Inline Refinement Instruction"
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
                      
                      {/* check_circle (Commit/Approve Field) */}
                      <button 
                        onClick={() => handleToggleApprove(field.name)}
                        title={isApproved ? "Unlock Field Editing" : "Commit & Approve Field"}
                        className={`size-7 rounded-md flex items-center justify-center border-none bg-transparent cursor-pointer transition-all ${
                          isApproved
                            ? 'text-success hover:bg-success/10 font-bold'
                            : 'text-outline hover:text-primary hover:bg-surface-container-high'
                        }`}
                      >
                        <Icon name={isApproved ? 'check_circle' : 'circle'} size={14} />
                      </button>
                      
                      {/* refresh (Regenerate Specific Field) */}
                      <button 
                        onClick={() => !isAiPaused && !isApproved && onRegenerateField?.(field.name)}
                        disabled={isAiPaused || isApproved || isDrafting}
                        title="Regenerate field value"
                        className={`size-7 rounded-md flex items-center justify-center border-none bg-transparent transition-all ${
                          isAiPaused || isApproved || isDrafting
                            ? 'opacity-40 cursor-not-allowed text-outline' 
                            : 'text-outline hover:text-error hover:bg-surface-container-high cursor-pointer'
                        }`}
                      >
                        <Icon 
                          name="refresh" 
                          size={14} 
                          className={isDrafting ? 'animate-spin text-primary' : ''} 
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Refinement Prompt Box */}
                {isInlineActive && (
                  <div className="flex gap-2 p-3 mb-3 bg-surface-container-lowest/80 backdrop-blur-[10px] rounded-xl border border-outline-variant/15 shadow-sm animate-in fade-in duration-300">
                    <input 
                      type="text"
                      placeholder={`Instruct the AI to refine this '${field.label || field.name}' field specifically...`}
                      value={inlinePrompts[field.name] || ''}
                      onChange={(e) => setInlinePrompts(prev => ({ ...prev, [field.name]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const prompt = inlinePrompts[field.name]?.trim()
                          if (prompt) {
                            onRefineField?.(field.name, prompt)
                            setActiveInlinePrompt(null)
                          }
                        }
                      }}
                      className="flex-1 bg-surface-container-low/50 border border-outline-variant/15 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-body"
                    />
                    <button
                      onClick={() => {
                        const prompt = inlinePrompts[field.name]?.trim()
                        if (prompt) {
                          onRefineField?.(field.name, prompt)
                          setActiveInlinePrompt(null)
                        }
                      }}
                      className="bg-primary text-on-primary px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none shadow-sm hover:opacity-95"
                    >
                      Refine
                    </button>
                    <button
                      onClick={() => setActiveInlinePrompt(null)}
                      className="bg-surface-container-high text-on-surface-variant px-3 py-1.5 rounded-lg font-label text-[10px] font-bold cursor-pointer border-none"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Drop Cap styling block for Body prose */}
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

      {/* Floating Formatting & AI Enhance Bar at the bottom center */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/15 rounded-full px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <button
          type="button"
          onClick={() => document.execCommand('bold')}
          title="Bold Selection"
          className="p-1.5 text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
        >
          <Icon name="format_bold" size={18} />
        </button>
        <button
          type="button"
          onClick={() => document.execCommand('italic')}
          title="Italic Selection"
          className="p-1.5 text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
        >
          <Icon name="format_italic" size={18} />
        </button>
        <button
          type="button"
          onClick={() => document.execCommand('formatBlock', false, '<h2>')}
          title="Heading"
          className="p-1.5 text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
        >
          <Icon name="title" size={18} />
        </button>
        <button
          type="button"
          onClick={() => document.execCommand('formatBlock', false, '<blockquote>')}
          title="Blockquote"
          className="p-1.5 text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
        >
          <Icon name="format_quote" size={18} />
        </button>

        <div className="w-[1px] h-4 bg-outline-variant/20"></div>

        {/* Dynamic Global Refinement Trigger */}
        <button
          onClick={() => {
            const promptStr = prompt("Describe how you would like to refine the overall draft style/structure:")
            if (promptStr?.trim()) {
              onRefine?.(promptStr)
            }
          }}
          className="bg-primary hover:bg-primary/90 text-on-primary font-label text-[10px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-full flex items-center gap-1 transition-all shadow-sm border-none cursor-pointer"
        >
          <Icon name="auto_awesome" size={12} className="text-on-primary animate-pulse" />
          <span>Enhance</span>
        </button>
      </div>
    </div>
  )
}
