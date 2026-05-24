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
    <div
      ref={setNodeRef}
      className={`builder-canvas flex-1 p-8 overflow-y-auto transition-colors ${
        isOver ? 'bg-[#3366cc]/5' : 'bg-transparent'
      }`}
    >
      <div className="max-w-4xl mx-auto min-h-[600px] border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center justify-start p-6 space-y-4 bg-white/[0.02]">
        {layout.length === 0 && !isOver && (
          <div className="mt-48 text-center">
            <div className="text-sm font-medium opacity-50">Canvas is empty</div>
            <div className="text-xs opacity-30 mt-2">
              Drag and drop building blocks from the library to start building.
            </div>
          </div>
        )}

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

        {isOver && (
          <div className="w-full h-24 border-2 border-dashed border-[#3366cc]/30 rounded-sm bg-[#3366cc]/10 flex items-center justify-center">
            <span className="text-xs font-medium text-[#3366cc]">Drop here</span>
          </div>
        )}
      </div>
    </div>
  )
}
