'use client'

import React from 'react'

interface MappingPanelProps {
  block?: any
  mappings: any
  onMappingChange: (mappings: any) => void
  onClose: () => void
  isOpen: boolean
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
  isOpen,
}) => {
  const [activeTab, setActiveTab] = React.useState<'properties' | 'settings'>('properties')
  
  if (!isOpen || !block) return null

  const blockSchema = block.schema?.properties || {}
  const properties = Object.keys(blockSchema)

  const handleFieldChange = (prop: string, field: string) => {
    onMappingChange({
      ...mappings,
      [prop]: field,
    })
  }

  return (
    <aside className="w-80 bg-surface-container-lowest border-l border-surface-container-low flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
      {/* Panel Header Tabs */}
      <div className="flex border-b border-surface-container-low font-label text-sm font-medium">
        <button 
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 transition-colors border-none bg-transparent cursor-pointer ${
            activeTab === 'properties' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
          }`}
        >
          Properties
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 transition-colors border-none bg-transparent cursor-pointer ${
            activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50'
          }`}
        >
          Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h3 className="font-headline text-lg font-semibold text-on-surface mb-1">{block.name}</h3>
            <p className="font-body text-xs text-on-surface-variant">Configure layout and data binding.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-md transition-colors border-none bg-transparent cursor-pointer">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {activeTab === 'properties' ? (
          <>
            {/* Data Binding Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-label text-sm font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">schema</span>
                  Schema Mapping
                </h4>
                <span className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                  Bound
                </span>
              </div>
              <div className="space-y-4">
                {properties.length === 0 && (
                  <p className="text-xs opacity-30 italic">No properties defined for this block.</p>
                )}
                {properties.map((prop) => (
                  <div key={prop} className="p-3 bg-surface rounded-lg border border-surface-container-high">
                    <label className="block font-label text-xs font-medium text-on-surface-variant mb-2">
                      {blockSchema[prop]?.label || prop}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <select 
                          value={mappings[prop] || ''}
                          onChange={(e) => handleFieldChange(prop, e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1.5 pl-2 pr-8 text-sm font-body text-on-surface appearance-none focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        >
                          <option value="">(Select Field)</option>
                          <option value="article.title">article.title</option>
                          <option value="article.subtitle">article.subtitle</option>
                          <option value="article.excerpt">article.excerpt</option>
                          <option value="article.hero_image">article.hero_image</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-2 top-2 text-on-surface-variant text-[16px] pointer-events-none">
                          expand_more
                        </span>
                      </div>
                      <button className="p-1.5 text-primary hover:bg-primary-fixed/50 rounded-md transition-colors bg-transparent border-none cursor-pointer flex items-center" title="Edit Transform">
                        <span className="material-symbols-outlined text-[16px]">code</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-surface-container-low my-6"></div>

            {/* Visual Properties */}
            <div>
              <h4 className="font-label text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">palette</span>
                Appearance
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block font-label text-xs text-on-surface-variant mb-1.5">Alignment</label>
                  <div className="flex bg-surface-container-low rounded-lg p-1">
                    <button className="flex-1 py-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex justify-center border-none bg-transparent cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">format_align_left</span>
                    </button>
                    <button className="flex-1 py-1 rounded-md bg-surface-container-lowest text-primary shadow-sm flex justify-center border-none cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">format_align_center</span>
                    </button>
                    <button className="flex-1 py-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex justify-center border-none bg-transparent cursor-pointer">
                      <span className="material-symbols-outlined text-[18px]">format_align_right</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-label text-xs text-on-surface-variant mb-1.5">Padding</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] text-on-surface-variant font-label">Top</span>
                      <input className="w-full bg-surface border border-outline-variant rounded-md py-1.5 pl-8 pr-2 text-sm font-body text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none" type="text" defaultValue="48px" />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-[10px] text-on-surface-variant font-label">Btm</span>
                      <input className="w-full bg-surface border border-outline-variant rounded-md py-1.5 pl-8 pr-2 text-sm font-body text-on-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none" type="text" defaultValue="48px" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">settings</span>
            <p className="text-sm text-on-surface-variant">Advanced block settings</p>
          </div>
        )}
      </div>
    </aside>
  )
}
