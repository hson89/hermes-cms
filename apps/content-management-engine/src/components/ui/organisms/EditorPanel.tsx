'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '../atoms/Badge'
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
  
  // Field Actions
  onRefineField?: (fieldName: string, instruction: string) => void
  onRegenerateField?: (fieldName: string) => void
  
  // Session / AI Controls
  isAiPaused?: boolean
  onPauseToggle?: (paused: boolean) => void
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
  
  onRefineField,
  onRegenerateField,
  isAiPaused = false,
  onPauseToggle
}) => {
  const [data, setData] = useState(draftData)
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())
  
  // Field-level states
  const [approvedFields, setApprovedFields] = useState<Set<string>>(new Set())
  const [activeInlinePrompt, setActiveInlinePrompt] = useState<string | null>(null)
  const [inlinePrompts, setInlinePrompts] = useState<Record<string, string>>({})
  
  // Version / History States
  const [versions, setVersions] = useState<Array<{ timestamp: Date; label: string; data: any }>>([])
  const [showVersionsDropdown, setShowVersionsDropdown] = useState(false)
  const [showMoreDropdown, setShowMoreDropdown] = useState(false)

  useEffect(() => {
    setData(draftData)
  }, [draftData])

  // Track draft snapshots for the dropdown version list
  useEffect(() => {
    if (!draftData || Object.keys(draftData).length === 0) return
    setVersions(prev => {
      // Add initial snapshot
      if (prev.length === 0) {
        return [{ timestamp: new Date(), label: 'V1 - Initial Generation', data: draftData }]
      }
      const last = prev[prev.length - 1]
      // Don't add version if data hasn't changed
      if (JSON.stringify(last.data) === JSON.stringify(draftData)) {
        return prev
      }
      // Skip active streaming states to capture distinct stable edits
      if (draftingFields.size > 0) {
        return prev
      }
      return [
        ...prev,
        {
          timestamp: new Date(),
          label: `V${prev.length + 1} - AI Refinement / Edit`,
          data: draftData
        }
      ]
    })
  }, [draftData, draftingFields])

  const handleChange = (name: string, value: any) => {
    if (approvedFields.has(name)) return // locked
    const newData = { ...data, [name]: value }
    setData(newData)
    setModifiedFields(prev => new Set(prev).add(name))
    onSave?.(newData)
  }

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
      const val = data[field.name]
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

  return (
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Editorial Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Drafting Session</span>
            <div className="flex items-center gap-3">
              <h2 className="font-headline text-3xl font-bold text-on-surface m-0">Content Refinement</h2>
              
              {/* Pause/Resume State Indicator */}
              {isAiPaused ? (
                <div className="flex items-center gap-1.5 bg-surface-container-high text-outline px-2 py-0.5 rounded-full border border-outline-variant/30 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                  <span className="font-label text-[10px] font-bold">PAUSED</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-success-container/10 text-success px-2 py-0.5 rounded-full border border-success/20 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                  <span className="font-label text-[10px] font-bold">LIVE</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 relative">
            {/* Pause/Resume AI Toggle */}
            <button
              onClick={() => onPauseToggle?.(!isAiPaused)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-label font-bold uppercase transition-all border border-outline-variant/20 cursor-pointer ${
                isAiPaused
                  ? 'bg-primary text-on-primary border-primary hover:bg-primary/95'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined !text-sm">
                {isAiPaused ? 'play_arrow' : 'pause'}
              </span>
              {isAiPaused ? 'Resume AI' : 'Pause AI'}
            </button>

            {/* Versions Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowVersionsDropdown(prev => !prev)
                  setShowMoreDropdown(false)
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high hover:bg-surface-variant text-on-surface-variant rounded-xl border border-outline-variant/20 text-xs font-label font-bold uppercase cursor-pointer"
              >
                <span className="material-symbols-outlined !text-sm">history</span>
                Versions
              </button>
              {showVersionsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-surface-container-low/95 backdrop-blur-[20px] rounded-xl border border-outline-variant/15 shadow-2xl z-50 p-2 font-body animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-outline font-bold border-b border-outline-variant/10 select-none">
                    Revision History
                  </div>
                  <div className="max-h-60 overflow-y-auto mt-1 custom-scrollbar">
                    {versions.map((ver, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setData(ver.data)
                          onSave?.(ver.data)
                          setShowVersionsDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors flex flex-col gap-1 cursor-pointer border-none bg-transparent"
                      >
                        <span className="text-xs font-semibold text-on-surface flex items-center justify-between">
                          {ver.label}
                          {JSON.stringify(data) === JSON.stringify(ver.data) && (
                            <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Active</span>
                          )}
                        </span>
                        <span className="text-[9px] text-outline">
                          {ver.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* More Options dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowMoreDropdown(prev => !prev)
                  setShowVersionsDropdown(false)
                }}
                className="flex items-center justify-center w-9 h-9 bg-surface-container-high hover:bg-surface-variant text-on-surface-variant rounded-xl border border-outline-variant/20 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-lg">more_horiz</span>
              </button>
              {showMoreDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-surface-container-low/95 backdrop-blur-[20px] rounded-xl border border-outline-variant/15 shadow-2xl z-50 p-1.5 font-body animate-in fade-in slide-in-from-top-2 duration-300">
                  <button
                    onClick={handleResetDraft}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-surface-container-high hover:text-primary transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent text-on-surface-variant font-medium"
                  >
                    <span className="material-symbols-outlined !text-sm">restart_alt</span>
                    Reset Draft
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-surface-container-high hover:text-primary transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent text-on-surface-variant font-medium"
                  >
                    <span className="material-symbols-outlined !text-sm">markdown</span>
                    Export to Markdown
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-surface-container-high hover:text-primary transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent text-on-surface-variant font-medium"
                  >
                    <span className="material-symbols-outlined !text-sm">download</span>
                    Export to JSON
                  </button>
                </div>
              )}
            </div>

            {/* Promote Action */}
            <button 
              onClick={onPromote}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label text-sm font-bold shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all border-none cursor-pointer"
            >
              Promote to Entry
            </button>
          </div>
        </div>

        {/* Style Selector */}
        <div className="flex flex-wrap items-center gap-2 py-2">
          {styleModifiers.map((style) => (
            <button
              key={style.id}
              onClick={() => onStyleChange?.(style.id)}
              className={`px-4 py-1.5 rounded-full font-label text-[11px] font-medium transition-all border cursor-pointer ${
                selectedStyle === style.id
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:border-primary/50'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>

        {activeStyle && (
          <div className="flex items-center gap-2 py-3 px-4 bg-surface-container-lowest rounded-lg border border-primary/20">
            <span className="material-symbols-outlined text-primary !text-sm">info</span>
            <p className="text-xs text-on-surface-variant font-body m-0">
              <span className="font-semibold text-on-surface">{activeStyle.name}:</span> {activeStyle.description || 'Tone parameters active.'}
            </p>
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-10">
        {!isAiPaused && <FloatingAIBar onRefine={onRefine || (() => {})} />}
        
        {schema.map((field: any) => {
          const isDrafting = draftingFields.has(field.name)
          const isModified = modifiedFields.has(field.name)
          const isApproved = approvedFields.has(field.name)
          const isInlineActive = activeInlinePrompt === field.name
          
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
                <label className="font-label text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-colors flex items-center gap-2">
                  {field.label || field.name}
                  {isApproved && (
                    <span className="flex items-center gap-0.5 bg-tertiary-container/30 text-tertiary px-2 py-0.5 rounded-full border border-tertiary/20 text-[8px] font-bold font-label uppercase select-none">
                      <span className="material-symbols-outlined !text-[10px]">lock</span>
                      Approved
                    </span>
                  )}
                </label>
                
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
                      <span className="material-symbols-outlined !text-sm">edit_note</span>
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
                      <span className="material-symbols-outlined !text-sm">
                        {isApproved ? 'check_circle' : 'circle'}
                      </span>
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
                      <span className={`material-symbols-outlined !text-sm ${isDrafting ? 'animate-spin text-primary' : ''}`}>
                        refresh
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Refinement Prompt Box */}
              {isInlineActive && (
                <div className="flex gap-2 p-3 mb-3 bg-surface-container-lowest/80 backdrop-blur-[10px] rounded-xl border border-outline-variant/15 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
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

              {/* Field Input Renderer */}
              <FieldRenderer 
                field={field} 
                value={data[field.name]} 
                isDrafting={isDrafting}
                disabled={isApproved}
                onChange={(val) => handleChange(field.name, val)} 
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
