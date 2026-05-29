'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableBlock } from './SortableBlock'
import { Icon } from '../ui/atoms/Icon'

interface BuilderCanvasProps {
  layout: any[]
  onSelect: (id: string) => void
  selectedId: string | null
}

/**
 * T013: BuilderCanvas (Refactored to Alexandria Designer Design).
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
      className={`flex-1 bg-surface-container-low overflow-y-auto flex flex-col items-center p-12 relative transition-colors scrollbar-thin ${
        isOver ? 'bg-primary/5' : ''
      }`}
      style={{
        backgroundImage: 'radial-gradient(#c3c6d5 0.5px, transparent 0.5px)',
        backgroundSize: '20px 20px'
      }}
    >
      {layout.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-outline/40 pointer-events-none z-0">
          <Icon name="touch_app" size={64} className="mb-4" />
          <p className="text-lg font-medium font-body">Select an element to edit properties</p>
        </div>
      )}

      <div className="w-full h-fit min-h-[800px] bg-white shadow-2xl border border-outline-variant flex flex-col max-w-[1200px] relative z-10 rounded-lg overflow-hidden">
        {/* Canvas Top Info */}
        <div className="p-2 border-b border-outline-variant/30 bg-surface flex justify-center shrink-0">
          <span className="text-[10px] uppercase tracking-widest font-bold text-outline font-label">Sandbox Workspace</span>
        </div>

        {/* Component Assembly Area */}
        <div className="flex-1 p-8">
          <div className="border-2 border-dashed border-outline-variant/50 rounded-lg p-6 relative group min-h-[400px]">
            <div className="absolute -top-3 left-4 bg-primary text-[10px] text-on-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider font-label z-20">
              Container: Page Root
            </div>
            
            <div className="space-y-6">
              <SortableContext items={layout.map(i => i.instanceId)} strategy={verticalListSortingStrategy}>
                {layout.map((item) => (
                  <SortableBlock 
                    key={item.instanceId} 
                    item={item} 
                    isSelected={item.instanceId === selectedId} 
                    onSelect={() => onSelect(item.instanceId)} 
                  />
                ))}
              </SortableContext>

              {/* Drop zone below */}
              <div className={`w-full border-2 border-dashed rounded py-8 flex flex-col items-center justify-center transition-all cursor-pointer ${
                isOver 
                  ? 'bg-primary/5 border-primary text-primary' 
                  : 'border-outline-variant/30 text-outline/50 hover:bg-primary/5 hover:border-primary/50'
              }`}>
                <Icon name={isOver ? 'download' : 'add_circle'} size={32} className="mb-2" />
                <p className="text-sm font-medium font-body">
                  {isOver ? 'Drop to add block' : 'Drag elements here to add more blocks'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

