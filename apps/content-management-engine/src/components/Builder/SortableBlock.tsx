'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../ui/atoms/Icon'

interface SortableBlockProps {
  item: {
    instanceId: string
    block: any
  }
  isSelected?: boolean
  onSelect?: () => void
}

/**
 * T013: SortableBlock (Refactored to Alexandria Designer Design).
 * 
 * Wrapper for items already in the canvas with visual proxies and actions.
 */
export const SortableBlock: React.FC<SortableBlockProps> = ({ item, isSelected, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.instanceId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 1,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Logic for deletion should be handled by the parent
    alert('Delete block logic - Phase 2')
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      className={`relative group border border-primary/20 rounded bg-background p-1 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'
      }`}
    >
      {/* Floating Action Buttons */}
      <div className="absolute -top-2 -right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          {...attributes} 
          {...listeners}
          className="w-6 h-6 bg-surface-container-highest border border-outline-variant rounded flex items-center justify-center shadow-sm cursor-grab"
        >
          <Icon name="drag_indicator" size={14} />
        </button>
        <button 
          onClick={handleDelete}
          className="w-6 h-6 bg-surface-container-highest border border-outline-variant rounded flex items-center justify-center shadow-sm text-error hover:bg-error/10 transition-colors border-none"
        >
          <Icon name="delete" size={14} />
        </button>
      </div>

      <BlockProxy block={item.block} />
    </div>
  )
}

const BlockProxy: React.FC<{ block: any }> = ({ block }) => {
  const slug = block.slug?.toLowerCase() || ''

  if (slug.includes('carousel')) {
    return (
      <div className="flex flex-col">
        <div className="flex h-64 bg-surface-container-high items-center justify-between px-4 rounded">
          <Icon name="chevron_left" size={40} className="text-outline/30" />
          <div className="text-center">
            <div className="border border-dashed border-primary/40 p-4 rounded mb-4">
              <Icon name="image" size={24} className="text-outline mb-1" />
              <p className="text-[10px] uppercase font-bold text-outline font-label m-0">Slide Image Placeholder</p>
            </div>
            <div className="border border-dashed border-primary/40 p-2 rounded">
              <h3 className="text-lg font-headline font-bold mb-1 m-0">Slide Title</h3>
              <p className="text-xs text-outline font-body m-0">Supporting slide description goes here...</p>
            </div>
          </div>
          <Icon name="chevron_right" size={40} className="text-outline/30" />
        </div>
        <div className="flex justify-center gap-1 mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-outline/30"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-outline/30"></div>
        </div>
      </div>
    )
  }

  // Default Fallback Proxy
  return (
    <div className="p-8 text-center bg-surface-container-low rounded border border-surface-container">
      <Icon 
        name={slug.includes('image') ? 'image' : slug.includes('text') ? 'notes' : 'widgets'} 
        size={32} 
        className="text-outline/30 mb-2" 
      />
      <h4 className="font-headline font-bold text-on-surface m-0">{block.name}</h4>
      <p className="text-xs text-outline font-body mt-1 m-0">Preview of the {slug} structure.</p>
    </div>
  )
}

