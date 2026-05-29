'use client'

import React from 'react'
import { Icon } from '../ui/atoms/Icon'

interface MappingPanelProps {
  block?: any
  mappings: any
  onMappingChange: (mappings: any) => void
  onClose: () => void
  isOpen: boolean
}

/**
 * T020: MappingPanel (Refactored to Alexandria Designer Design).
 * 
 * Allows Content Architects to bind BuildingBlock properties 
 * to Content Type schema fields and configure styles.
 */
export const MappingPanel: React.FC<MappingPanelProps> = ({
  block,
  mappings,
  onMappingChange,
  onClose,
  isOpen,
}) => {
  const [activeTab, setActiveTab] = React.useState<'properties' | 'mapping'>('properties')
  
  if (!isOpen || !block) return null

  const handleFieldChange = (prop: string, field: string) => {
    onMappingChange({
      ...mappings,
      [prop]: field,
    })
  }

  const blockSlug = block.slug?.toLowerCase() || ''
  const isCarousel = blockSlug.includes('carousel')

  return (
    <aside className="w-80 border-l border-outline-variant flex flex-col bg-surface transition-[width,opacity] duration-300 ease-in-out overflow-hidden z-30 shrink-0">
      <div className="flex border-b border-outline-variant font-label">
        <button 
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-none cursor-pointer transition-colors ${
            activeTab === 'properties' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface-variant bg-transparent'
          }`}
        >
          Properties
        </button>
        <button 
          onClick={() => setActiveTab('mapping')}
          className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-none cursor-pointer transition-colors ${
            activeTab === 'mapping' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface-variant bg-transparent'
          }`}
        >
          Mapping
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Selected Element Identification */}
        <div className="p-4 bg-primary/5 border-b border-outline-variant/30 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon name={isCarousel ? 'view_carousel' : 'widgets'} size={14} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest font-label">Selected: {block.name}</span>
            </div>
            <p className="text-[10px] text-outline m-0 font-body">Block ID: <code className="bg-surface px-1">{block.slug}</code></p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded transition-colors border-none bg-transparent cursor-pointer">
            <Icon name="close" size={16} className="text-outline" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {activeTab === 'properties' ? (
            <>
              {/* Styling/Configuration Section */}
              <section>
                <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-4 font-label">Configuration</h4>
                <div className="space-y-4">
                  {isCarousel && (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-on-surface-variant font-body">Transition Effect</label>
                        <select className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary font-body cursor-pointer">
                          <option>Slide (Horizontal)</option>
                          <option>Fade</option>
                          <option>Slide (Vertical)</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-on-surface-variant font-body">Autoplay</label>
                        <div className="w-10 h-5 bg-primary rounded-full relative cursor-pointer">
                          <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-on-surface-variant font-body">Interval (ms)</label>
                        <input className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary font-body" type="number" defaultValue="5000" />
                      </div>
                    </>
                  )}
                  {!isCarousel && (
                    <p className="text-xs text-outline italic">Configure block-specific styles here.</p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Mapping Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-outline uppercase tracking-widest font-label">CMS Data Mapping</h4>
                  <Icon name="info" size={14} className="text-primary cursor-pointer" />
                </div>
                <div className="space-y-4">
                  {/* Dynamic properties from block schema */}
                  {Object.keys(block.schema?.properties || {}).map((prop) => (
                    <div key={prop} className="p-3 border border-outline-variant rounded bg-surface-container-low transition-all hover:border-primary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-label">
                          {block.schema.properties[prop].label || prop}
                        </span>
                        <Icon name="link" size={12} className="text-outline cursor-pointer" />
                      </div>
                      <select 
                        value={mappings[prop] || ''}
                        onChange={(e) => handleFieldChange(prop, e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-xs outline-none font-body cursor-pointer"
                      >
                        <option value="">(Unmapped)</option>
                        <option value="entry_title">entry_title</option>
                        <option value="hero_image">hero_image</option>
                        {isCarousel && <option value="slide_items[].image_url">slide_items[].image_url</option>}
                        <option value="custom">+ Create New Key</option>
                      </select>
                    </div>
                  ))}
                  {Object.keys(block.schema?.properties || {}).length === 0 && (
                    <p className="text-xs text-outline italic">No mappable properties for this block.</p>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Advanced / Schema Export Section */}
          <section>
            <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-4 font-label">Schema Export</h4>
            <div className="bg-inverse-surface text-inverse-on-surface p-3 rounded font-mono text-[10px] overflow-hidden">
              <pre className="opacity-80 m-0"><code>{JSON.stringify({
                type: 'object',
                properties: block.schema?.properties || {}
              }, null, 2)}</code></pre>
            </div>
          </section>
        </div>
      </div>

      <div className="p-4 border-t border-outline-variant bg-surface-container-low shrink-0">
        <button className="w-full py-2 border border-primary text-primary text-xs font-bold uppercase tracking-widest rounded hover:bg-primary hover:text-on-primary transition-all font-label bg-transparent cursor-pointer">
          Validate Schema
        </button>
      </div>
    </aside>
  )
}

