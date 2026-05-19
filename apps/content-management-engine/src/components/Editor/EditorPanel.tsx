"use client"

import React, { useState, useEffect } from 'react'
import { FieldRenderer } from './FieldRenderer'
import { AISuggestIndicator } from './AISuggestIndicator'
import { FloatingAIBar } from './FloatingAIBar'

export const EditorPanel: React.FC<{
  draftData: any
  schema: any
  onSave?: (data: any) => void
  onRefine?: (prompt: string) => void
}> = ({ draftData, schema, onSave, onRefine }) => {
  const [data, setData] = useState(draftData)
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Detect which fields were updated by AI
    const newModified = new Set<string>()
    if (draftData) {
      Object.keys(draftData).forEach(key => {
        if (draftData[key] !== data[key]) {
          newModified.add(key)
        }
      })
    }
    setModifiedFields(newModified)
    setData(draftData)
  }, [draftData])

  const handleChange = (name: string, value: any) => {
    const newData = { ...data, [name]: value }
    setData(newData)
    onSave?.(newData)
  }

  if (!schema) return <div>No schema loaded.</div>

  return (
    <div className="space-y-12">
      <FloatingAIBar onRefine={onRefine || (() => {})} />
      {schema.map((field: any) => (
        <div key={field.name} className="space-y-4">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-3">
              <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
                {field.label || field.name}
              </label>
              <AISuggestIndicator isNew={modifiedFields.has(field.name)} />
            </div>
            <span className="font-label text-[10px] text-on-surface-variant/40 italic">
              {field.type}
            </span>
          </div>
          <FieldRenderer 
            field={field} 
            value={data[field.name]} 
            onChange={(val) => handleChange(field.name, val)} 
          />
        </div>
      ))}
    </div>
  )
}
