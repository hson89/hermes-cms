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
  const [templateName, setTemplateName] = useState<string>('')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  
  const { saveTemplate, isSaving } = useTemplatePersistence(templateId)

  const selectedInstance = layout.find((i) => i.id === selectedInstanceId)

  useEffect(() => {
    if (templateId) {
      fetch(`/api/page-templates/${templateId}`)
        .then((res) => res.json())
        .then((data) => {
          setTemplateName(data.name || '')
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
    <AdminView hideHeader={true} className="builder-workspace flex flex-col h-screen overflow-hidden bg-background">
      <DeploymentToolbar onSave={handleSave} isSaving={isSaving} templateId={templateId} templateName={templateName} />
      
      {!templateId ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-surface-container/50 animate-in fade-in duration-500">
          <div className="max-w-md text-center space-y-6 p-8 bg-surface-container-lowest border border-surface-container-low rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">menu_book</span>
            </div>
            <h3 className="text-xl font-headline font-semibold text-on-surface">No Template Selected</h3>
            <p className="font-body text-sm text-on-surface-variant">
              Select an existing template to edit or create a new structure for your content.
            </p>
            <div className="flex flex-col gap-3">
              <a 
                href="/admin/collections/page-templates"
                className="w-full py-3 bg-primary text-on-primary rounded-xl text-sm font-label font-semibold hover:bg-primary-container transition-all no-underline flex items-center justify-center"
              >
                Go to Page Templates
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <BlockLibrary />
            <BuilderCanvas layout={layout} onSelect={setSelectedInstanceId} selectedId={selectedInstanceId} />
            <MappingPanel
              block={selectedInstance?.block}
              mappings={selectedInstance?.mappings || {}}
              onMappingChange={handleMappingChange}
              onClose={() => setSelectedInstanceId(null)}
              isOpen={!!selectedInstance}
            />
          </DndContext>
        </div>
      )}
    </AdminView>
  )
}
