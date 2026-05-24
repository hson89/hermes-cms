'use client'

import React from 'react'

interface MappingPanelProps {
  block: any
  mappings: any
  onMappingChange: (mappings: any) => void
  onClose: () => void
}

/**
 * T020: MappingPanel.
 * 
 * Allows Content Architects to bind BuildingBlock properties 
 * to Content Type schema fields.
 */
export const MappingPanel: React.FC<MappingPanelProps> = ({
  block,
  mappings,
  onMappingChange,
  onClose,
}) => {
  const blockSchema = block.schema?.properties || {}
  const properties = Object.keys(blockSchema)

  const handleFieldChange = (prop: string, field: string) => {
    onMappingChange({
      ...mappings,
      [prop]: field,
    })
  }

  return (
    <div className="mapping-panel w-80 border-l border-white/15 bg-black/10 backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-white/15 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Block Settings</h3>
          <p className="text-[10px] opacity-40 font-mono">{block.slug}</p>
        </div>
        <button onClick={onClose} className="text-xs opacity-50 hover:opacity-100">
          Close
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-4">
            Field Mappings
          </h4>
          <div className="space-y-4">
            {properties.length === 0 && (
              <p className="text-xs opacity-30 italic">No properties defined for this block.</p>
            )}
            {properties.map((prop) => (
              <div key={prop} className="space-y-1.5">
                <label className="text-[11px] font-medium opacity-70">
                  {blockSchema[prop]?.label || prop}
                </label>
                <input
                  type="text"
                  placeholder="Content Type Field (e.g. title)"
                  value={mappings[prop] || ''}
                  onChange={(e) => handleFieldChange(prop, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-xs focus:border-[#3366cc] outline-none transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
