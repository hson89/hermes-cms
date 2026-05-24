'use client'

import React, { useState, useEffect } from 'react'
import { AdminView } from '../admin/AdminView'
import { BlockLibrary } from './BlockLibrary'
import { BuilderCanvas } from './BuilderCanvas'
import { DeploymentToolbar } from './DeploymentToolbar'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTemplatePersistence } from './hooks/useTemplatePersistence'
import { useParams } from 'next/navigation'
import { MappingPanel } from './MappingPanel'

/**
 * T015: BuilderWorkspace Entry Point.
 */
export const BuilderWorkspace: React.FC = () => {
  const params = useParams()
  const templateId = params.templateId as string
  const [layout, setLayout] = useState<any[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  
  const { saveTemplate, isSaving } = useTemplatePersistence(templateId)

  const selectedInstance = layout.find((i) => i.id === selectedInstanceId)

  useEffect(() => {
    if (templateId) {
      fetch(`/api/page-templates/${templateId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.layout) {
            setLayout(data.layout.map((item: any, index: number) => ({
              id: item.id || `instance-${index}-${Date.now()}`,
              ...item
            })))
          }
        })
    }
  }, [templateId])

  const handleSave = async () => {
    await saveTemplate(layout)
  }

  const handleMappingChange = (newMappings: any) => {
    setLayout((items) =>
      items.map((i) => (i.id === selectedInstanceId ? { ...i, mappings: newMappings } : i)),
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    // 1. Reordering within canvas
    if (active.id !== over.id && !active.id.toString().startsWith('library-')) {
      setLayout((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    
    // 2. Adding from library
    if (active.id.toString().startsWith('library-') && over.id === 'builder-canvas') {
      const blockData = active.data.current?.block
      if (blockData) {
        setLayout((items) => [
          ...items,
          {
            id: `instance-${Date.now()}`,
            block: blockData,
            mappings: {},
          },
        ])
      }
    }
  }

  return (
    <AdminView className="builder-workspace flex flex-col h-screen overflow-hidden">
      <DeploymentToolbar onSave={handleSave} isSaving={isSaving} templateId={templateId} />
      <div className="flex flex-1 overflow-hidden">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <BlockLibrary />
          <BuilderCanvas layout={layout} onSelect={setSelectedInstanceId} selectedId={selectedInstanceId} />
          {selectedInstance && (
            <MappingPanel
              block={selectedInstance.block}
              mappings={selectedInstance.mappings}
              onMappingChange={handleMappingChange}
              onClose={() => setSelectedInstanceId(null)}
            />
          )}
        </DndContext>
      </div>
    </AdminView>
  )
}
