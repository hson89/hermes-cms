'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '../atoms/Badge'
import { FieldRenderer } from '../molecules/FieldRenderer'
import { FloatingAIBar } from '../molecules/FloatingAIBar'

export const EditorPanel: React.FC<{
  draftData: any
  draftingFields?: Set<string>
  schema: any
  onSave?: (data: any) => void
  onRefine?: (prompt: string) => void
  styleModifiers?: any[]
  selectedStyle?: string | null
  onStyleChange?: (id: string | null) => void
  onPromote?: () => void
}> = ({ 
  draftData, 
  draftingFields = new Set(),
  schema, 
  onSave, 
  onRefine, 
  styleModifiers = [], 
  selectedStyle = null, 
  onStyleChange,
  onPromote
}) => {
  const [data, setData] = useState(draftData)
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    setData(draftData)
  }, [draftData])

  const handleChange = (name: string, value: any) => {
    const newData = { ...data, [name]: value }
    setData(newData)
    setModifiedFields(prev => new Set(prev).add(name))
    onSave?.(newData)
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
              <div className="flex items-center gap-1.5 bg-success-container/10 text-success px-2 py-0.5 rounded-full border border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                <span className="font-label text-[10px] font-bold">LIVE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
        <FloatingAIBar onRefine={onRefine || (() => {})} />
        {schema.map((field: any) => {
          const isDrafting = draftingFields.has(field.name)
          const isModified = modifiedFields.has(field.name)
          
          return (
            <div key={field.name} className="group">
              <div className="flex justify-between items-center mb-2">
                <label className="font-label text-[10px] uppercase tracking-widest text-outline group-focus-within:text-primary transition-colors">
                  {field.label || field.name}
                </label>
                <div className="flex items-center gap-3">
                  <Badge isNew={isModified} />
                  <div className="flex items-center gap-1">
                    <button className="text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer">
                      <span className="material-symbols-outlined !text-sm">edit_note</span>
                    </button>
                    <button className="text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer">
                      <span className="material-symbols-outlined !text-sm">check_circle</span>
                    </button>
                    <button className="text-outline hover:text-error transition-colors border-none bg-transparent cursor-pointer">
                      <span className="material-symbols-outlined !text-sm">refresh</span>
                    </button>
                  </div>
                </div>
              </div>
              <FieldRenderer 
                field={field} 
                value={data[field.name]} 
                isDrafting={isDrafting}
                onChange={(val) => handleChange(field.name, val)} 
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
