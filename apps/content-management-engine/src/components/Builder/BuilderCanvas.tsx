'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableBlock } from './SortableBlock'

interface BuilderCanvasProps {
  layout: any[]
  onSelect: (id: string) => void
  selectedId: string | null
}

/**
 * T013: BuilderCanvas.
 * 
 * The dropping zone for blocks. Uses SortableContext for reordering
 * and useDroppable to detect incoming new blocks from the library.
 */
export const BuilderCanvas: React.FC<BuilderCanvasProps> = ({ layout, onSelect, selectedId }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'builder-canvas',
  })

  return (
    <section
      ref={setNodeRef}
      className={`flex-1 bg-surface-container flex justify-center overflow-y-auto p-8 relative transition-colors ${
        isOver ? 'bg-primary/5' : ''
      }`}
    >
      <div className="w-full max-w-[800px] bg-surface-container-lowest min-h-[1000px] shadow-sm rounded-xl overflow-hidden relative flex flex-col">
        <SortableContext items={layout.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {layout.map((item) => (
            <SortableBlock 
              key={item.id} 
              item={item} 
              isSelected={item.id === selectedId} 
              onSelect={() => onSelect(item.id)} 
            />
          ))}
        </SortableContext>

        {/* Add Block Area / Placeholder */}
        <div className="p-8 flex justify-center mt-auto">
          <button className={`w-full max-w-md py-6 border-2 border-dashed rounded-xl font-label text-sm font-medium transition-all flex items-center justify-center gap-2 bg-transparent cursor-pointer ${
            isOver 
              ? 'border-primary text-primary bg-primary-fixed/10' 
              : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary hover:bg-primary-fixed/10'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {isOver ? 'download' : 'add_circle'}
            </span>
            {isOver ? 'Drop block here' : 'Drag block here or click to add'}
          </button>
        </div>
      </div>
    </section>
  )
}
