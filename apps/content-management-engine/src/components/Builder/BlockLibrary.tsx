'use client'

import React, { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'

/**
 * T014: BlockLibrary.
 * 
 * Lists all registered BuildingBlocks available to the tenant.
 */
export const BlockLibrary: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([])

  useEffect(() => {
    // Fetch registered building blocks for the current tenant
    // Payload REST API automatically applies tenant isolation via access control
    fetch('/api/building-blocks?limit=100')
      .then((res) => res.json())
      .then((data) => setBlocks(data.docs || []))
      .catch((err) => console.error('Failed to fetch blocks:', err))
  }, [])

  return (
    <div className="block-library w-72 border-r border-white/15 bg-black/5 flex flex-col">
      <div className="p-4 border-b border-white/15">
        <h3 className="text-xs font-semibold uppercase tracking-wider opacity-50">Building Blocks</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {blocks.length === 0 && (
          <div className="text-xs opacity-40 italic">No blocks registered.</div>
        )}
        {blocks.map((block) => (
          <DraggableBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
  )
}

const DraggableBlock: React.FC<{ block: any }> = ({ block }) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="block-library-item p-4 bg-white/5 border border-white/10 rounded-sm cursor-grab hover:border-[#3366cc]/50 transition-all active:scale-95"
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{block.name}</div>
        {block.status === 'deprecated' && (
          <span className="text-[8px] uppercase bg-red-500/20 text-red-400 px-1 py-0.5 rounded-sm">
            Deprecated
          </span>
        )}
      </div>
      <div className="text-[10px] opacity-40 font-mono mt-1">{block.slug}</div>
    </div>
  )
}
