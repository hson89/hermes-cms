'use client'

import React, { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Icon } from '../ui/atoms/Icon'

/**
 * T014: BlockLibrary (Refactored to Alexandria Designer Design).
 * 
 * Lists all registered BuildingBlocks available to the tenant.
 */
export const BlockLibrary: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetch('/api/building-blocks?limit=100')
      .then((res) => res.json())
      .then((data) => setBlocks(data.docs || []))
      .catch((err) => console.error('Failed to fetch blocks:', err))
  }, [])

  const filteredBlocks = blocks.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const layoutBlocks = filteredBlocks.filter(b => b.category === 'layout')
  const atomicBlocks = filteredBlocks.filter(b => b.category === 'text' || b.category === 'media' || (!b.category && !b.slug.includes('interactive')))
  const interactiveBlocks = filteredBlocks.filter(b => b.category === 'interactive')

  return (
    <aside className="border-r border-outline-variant flex flex-col bg-surface-container-low w-72 shrink-0">
      <div className="p-4 border-b border-outline-variant">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm font-body" 
            placeholder="Search elements..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {/* Layout Elements */}
        <section>
          <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-3 flex items-center justify-between font-label">
            Layout
            <Icon name="keyboard_arrow_down" size={16} />
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {layoutBlocks.map(block => (
              <DraggableBlock key={block.id} block={block} variant="grid" />
            ))}
            {layoutBlocks.length === 0 && (
              <div className="col-span-2 text-[10px] text-outline italic text-center py-2">No layout blocks found</div>
            )}
          </div>
        </section>

        {/* Atomic Elements */}
        <section>
          <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-3 flex items-center justify-between font-label">
            Atomic Elements
            <Icon name="keyboard_arrow_down" size={16} />
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {atomicBlocks.map(block => (
              <DraggableBlock key={block.id} block={block} variant="grid" />
            ))}
            {atomicBlocks.length === 0 && (
              <div className="col-span-2 text-[10px] text-outline italic text-center py-2">No atomic elements found</div>
            )}
          </div>
        </section>

        {/* Interactive Components */}
        <section>
          <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-3 flex items-center justify-between font-label">
            Interactive
            <Icon name="new_releases" size={16} className="text-primary" />
          </h3>
          <div className="space-y-2">
            {interactiveBlocks.map(block => (
              <DraggableBlock key={block.id} block={block} variant="interactive" />
            ))}
            {interactiveBlocks.length === 0 && (
              <div className="text-[10px] text-outline italic text-center py-2">No interactive blocks found</div>
            )}
          </div>
        </section>
      </div>
    </aside>
  )
}

const DraggableBlock: React.FC<{ block: any, variant: 'grid' | 'interactive' }> = ({ block, variant }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${block.slug}`,
    data: {
      type: 'BLOCK_DEFINITION',
      block,
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  const getIcon = (slug: string) => {
    const s = slug.toLowerCase()
    if (s.includes('container')) return 'crop_square'
    if (s.includes('grid')) return 'grid_view'
    if (s.includes('column')) return 'view_column'
    if (s.includes('section')) return 'rectangle'
    if (s.includes('heading') || s.includes('title')) return 'title'
    if (s.includes('text') || s.includes('note')) return 'notes'
    if (s.includes('image') || s.includes('media')) return 'image'
    if (s.includes('button')) return 'smart_button'
    if (s.includes('link')) return 'link'
    if (s.includes('divider') || s.includes('rule')) return 'horizontal_rule'
    if (s.includes('carousel')) return 'view_carousel'
    if (s.includes('tabs')) return 'view_agenda'
    if (s.includes('accordion')) return 'expand'
    return 'widgets'
  }

  if (variant === 'grid') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="border border-outline-variant bg-surface p-3 rounded flex flex-col items-center gap-2 cursor-grab hover:border-primary transition-colors group"
      >
        <Icon 
          name={getIcon(block.slug)} 
          className="text-outline group-hover:text-primary transition-colors" 
          size={24} 
        />
        <span className="text-xs font-medium font-label">{block.name}</span>
      </div>
    )
  }

  // Interactive variant
  const isCarousel = block.slug.toLowerCase().includes('carousel')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded flex items-center gap-3 cursor-grab transition-colors relative overflow-hidden group ${
        isCarousel 
          ? 'border-2 border-primary bg-primary/5' 
          : 'border border-outline-variant bg-surface hover:border-primary'
      }`}
    >
      {isCarousel && (
        <div className="absolute top-0 right-0 bg-primary text-[10px] text-on-primary px-1.5 py-0.5 rounded-bl font-bold uppercase tracking-tighter">Active</div>
      )}
      <div className={`w-10 h-10 rounded flex items-center justify-center ${isCarousel ? 'bg-primary/10' : 'bg-surface-container'}`}>
        <Icon 
          name={getIcon(block.slug)} 
          className={isCarousel ? 'text-primary' : 'text-outline group-hover:text-primary'} 
          size={24} 
        />
      </div>
      <div>
        <span className={`text-xs font-bold block font-label ${isCarousel ? 'text-on-surface' : 'font-medium'}`}>
          {block.name}
        </span>
        <span className="text-[10px] text-outline font-body">
          {isCarousel ? 'Multi-item slider' : `${block.name} component`}
        </span>
      </div>
    </div>
  )
}

