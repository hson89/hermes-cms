'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableBlockProps {
  item: {
    id: string
    block: any
  }
  isSelected?: boolean
  onSelect?: () => void
}

/**
 * SortableBlock wrapper for items already in the canvas.
 */
export const SortableBlock: React.FC<SortableBlockProps> = ({ item, isSelected, onSelect }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 1,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.()
      }}
      className={`relative group border-2 transition-all cursor-pointer ${
        isSelected ? 'border-primary' : 'border-transparent hover:border-outline-variant'
      }`}
    >
      {/* Action Bar */}
      <div className={`absolute -top-3 right-4 flex items-center rounded-md shadow-md z-10 text-xs font-label transition-opacity ${
        isSelected ? 'bg-primary text-on-primary opacity-100' : 'bg-surface-container-highest text-on-surface-variant opacity-0 group-hover:opacity-100 shadow-sm'
      }`}>
        <span className={`px-2 py-1 border-r ${isSelected ? 'border-primary-container' : 'border-outline-variant'}`}>
          {item.block.name}
        </span>
        <div {...attributes} {...listeners} className={`p-1 hover:bg-black/10 transition-colors flex items-center cursor-grab`}>
          <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
        </div>
        <button className="p-1 hover:bg-black/10 transition-colors bg-transparent border-none text-inherit cursor-pointer flex items-center">
          <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
        </button>
        <button className="p-1 hover:bg-black/10 transition-colors bg-transparent border-none text-inherit cursor-pointer flex items-center">
          <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
        </button>
        <button className={`p-1 hover:bg-error hover:text-on-error rounded-r-md transition-colors bg-transparent border-none text-inherit cursor-pointer flex items-center`}>
          <span className="material-symbols-outlined text-[14px]">delete</span>
        </button>
      </div>

      {/* Content Render / Preview */}
      <div className={`p-12 text-center bg-surface-container-low border-b border-surface-container ${isSelected ? '' : 'bg-opacity-50'}`}>
        <h1 className="font-headline text-2xl text-on-surface mb-2 font-bold tracking-tight">
          {item.block.name} Block
        </h1>
        <p className="font-body text-sm text-on-surface-variant max-w-lg mx-auto">
          Preview of the {item.block.slug} component structure. 
          Data will be populated from mapped fields.
        </p>
      </div>
    </div>
  )
}
