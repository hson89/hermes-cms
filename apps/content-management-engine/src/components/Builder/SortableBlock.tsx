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
      onClick={onSelect}
      className={`w-full bg-white/5 border rounded-sm p-4 flex items-center justify-between group hover:border-white/20 transition-all cursor-pointer ${
        isSelected ? 'border-[#3366cc] bg-[#3366cc]/5' : 'border-white/10'
      }`}
    >
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="cursor-grab opacity-20 group-hover:opacity-100 transition-opacity p-2 -m-2">
          <DragHandleIcon />
        </div>
        <div>
          <div className="text-sm font-medium">{item.block.name}</div>
          <div className="text-[10px] opacity-40 font-mono">{item.block.slug}</div>
        </div>
      </div>
      
      <button className="text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 hover:text-red-400 transition-all">
        Remove
      </button>
    </div>
  )
}

const DragHandleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="4" cy="2" r="1" fill="currentColor" />
    <circle cx="8" cy="2" r="1" fill="currentColor" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="8" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="10" r="1" fill="currentColor" />
    <circle cx="8" cy="10" r="1" fill="currentColor" />
  </svg>
)
