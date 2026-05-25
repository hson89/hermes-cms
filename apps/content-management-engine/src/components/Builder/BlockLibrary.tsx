'use client'

import React, { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import Link from 'next/link'

/**
 * T014: BlockLibrary.
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

  // In a real scenario, these categories would come from the block definition
  // For this UI update, we'll split them logically
  const layoutBlocks = filteredBlocks.filter(b => b.slug.includes('layout') || b.slug.includes('column'))
  const contentBlocks = filteredBlocks.filter(b => !layoutBlocks.includes(b))

  return (
    <aside className="w-64 bg-surface-container-lowest border-r border-surface-container-low flex flex-col shrink-0">
      <div className="p-4 border-b border-surface-container-low">
        <h3 className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
          Components
        </h3>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-sm">
            search
          </span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-lg pl-9 pr-3 py-2 text-sm font-body text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none" 
            placeholder="Search blocks..." 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Category: Layout */}
        {layoutBlocks.length > 0 && (
          <div>
            <h4 className="font-label text-xs font-medium text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">grid_view</span> Layout
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {layoutBlocks.map(block => (
                <DraggableBlock key={block.id} block={block} variant="grid" />
              ))}
            </div>
          </div>
        )}

        {/* Category: Content */}
        <div>
          <h4 className="font-label text-xs font-medium text-on-surface-variant mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">article</span> Content
          </h4>
          <div className="space-y-2">
            {contentBlocks.length === 0 && layoutBlocks.length === 0 && (
              <div className="py-8 text-center px-4">
                <div className="text-xs opacity-40 italic">No blocks found.</div>
                <Link 
                  href="/admin/collections/building-blocks"
                  className="inline-block mt-4 px-3 py-2 bg-surface-container-low rounded-lg text-[10px] uppercase tracking-widest hover:bg-surface-container-high transition-colors no-underline text-on-surface font-semibold"
                >
                  Add Block
                </Link>
              </div>
            )}
            {contentBlocks.map(block => (
              <DraggableBlock key={block.id} block={block} variant="list" />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

const DraggableBlock: React.FC<{ block: any, variant: 'grid' | 'list' }> = ({ block, variant }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `library-${block.slug}`,
    data: {
      type: 'BLOCK_DEFINITION',
      block,
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined

  if (variant === 'grid') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="aspect-square bg-surface-container-low rounded-lg border border-surface-container hover:border-primary/50 hover:bg-primary-fixed/20 cursor-grab flex flex-col items-center justify-center gap-2 transition-colors group"
      >
        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
          {block.slug.includes('2') ? 'view_column_2' : 'view_column'}
        </span>
        <span className="font-label text-[10px] text-on-surface-variant group-hover:text-primary transition-colors text-center px-1">
          {block.name}
        </span>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 bg-surface-container-low rounded-lg border border-surface-container hover:border-primary/50 hover:bg-primary-fixed/20 cursor-grab flex items-center gap-3 transition-colors group"
    >
      <span className="material-symbols-outlined text-on-surface-variant text-lg group-hover:text-primary transition-colors">
        {block.slug.includes('title') || block.slug.includes('headline') ? 'title' : 
         block.slug.includes('text') ? 'notes' : 
         block.slug.includes('image') || block.slug.includes('media') ? 'image' : 'widgets'}
      </span>
      <span className="font-body text-sm text-on-surface group-hover:text-primary transition-colors">
        {block.name}
      </span>
    </div>
  )
}
