'use client'

import React, { useState, useEffect } from 'react'
import { AdminView } from '../admin/AdminView'
import { BlockLibrary } from './BlockLibrary'
import { BuilderCanvas } from './BuilderCanvas'
import { DeploymentToolbar } from './DeploymentToolbar'
import { 
  DndContext, 
  DragEndEvent, 
  closestCenter, 
  PointerSensor, 
  KeyboardSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core'
import { 
  arrayMove, 
  sortableKeyboardCoordinates 
} from '@dnd-kit/sortable'
import { useTemplatePersistence } from './hooks/useTemplatePersistence'
import { useParams } from 'next/navigation'
import { MappingPanel } from './MappingPanel'

/**
 * T015 / T039: BuilderWorkspace Entry Point (Refactored to Alexandria Designer).
 */
export const BuilderWorkspace: React.FC = () => {
  const params = useParams()
  
  // Handle segments from catch-all route: /admin/templates/builder/:id
  const segments = (params as any)?.segments || []
  const templateId = segments[2] || (params as any)?.templateId
  
  const [layout, setLayout] = useState<any[]>([])
  const [templateName, setTemplateName] = useState<string>('')
  const [archetype, setArchetype] = useState<string>('')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  
  const { saveTemplate, isSaving } = useTemplatePersistence(templateId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const selectedInstance = layout.find((i) => i.instanceId === selectedInstanceId)

  useEffect(() => {
    if (templateId && templateId !== 'new') {
      fetch(`/api/page-templates/${templateId}?depth=1`)
        .then((res) => res.json())
        .then((data) => {
          setTemplateName(data.name || '')
          setArchetype(data.archetype || 'Landing Page')
          if (data.layout) {
            setLayout(data.layout.map((item: any, index: number) => ({
              instanceId: item.instanceId || `instance-${index}-${Date.now()}`,
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
      items.map((i) => (i.instanceId === selectedInstanceId ? { ...i, mappings: newMappings } : i)),
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id.toString()
    const overId = over.id.toString()

    // 1. Reordering within canvas
    if (activeId !== overId && !activeId.startsWith('library-')) {
      setLayout((items) => {
        const oldIndex = items.findIndex((i) => i.instanceId === activeId)
        const newIndex = items.findIndex((i) => i.instanceId === overId)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    
    // 2. Adding from library
    if (activeId.startsWith('library-')) {
      const blockData = active.data.current?.block
      if (blockData) {
        setLayout((items) => {
          const newInstance = {
            instanceId: `instance-${Date.now()}`,
            block: blockData,
            mappings: {},
          }

          // If dropped over a specific block, insert at that index
          const overIndex = items.findIndex((i) => i.instanceId === overId)
          if (overIndex !== -1) {
            const newLayout = [...items]
            newLayout.splice(overIndex, 0, newInstance)
            return newLayout
          }

          // Otherwise append to end
          return [...items, newInstance]
        })
      }
    }
  }

  return (
    <AdminView hideHeader={true} className="builder-workspace flex flex-col h-screen overflow-hidden bg-background font-body">
      <DeploymentToolbar 
        onSave={handleSave} 
        isSaving={isSaving} 
        templateId={templateId} 
        templateName={templateName}
        archetype={archetype}
        category="Page Templates / Visual Builder"
      />
      
      {!templateId || templateId === 'new' ? (
        <div className="flex-grow flex flex-col items-center justify-center bg-surface-container-low/50">
          <div className="max-w-md text-center space-y-6 p-8 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">widgets</span>
            </div>
            <h3 className="text-xl font-headline font-bold text-on-surface m-0">Initialize Workspace</h3>
            <p className="font-body text-sm text-on-surface-variant m-0">
              Please create or select a template first to begin visual assembly.
            </p>
            <div className="flex flex-col gap-3">
              <a 
                href="/admin/collections/page-templates"
                className="w-full py-3 bg-primary text-on-primary rounded-lg text-sm font-label font-bold uppercase tracking-widest hover:opacity-90 transition-all no-underline flex items-center justify-center border-none shadow-sm"
              >
                Go to Page Templates
              </a>
              <a 
                href="/admin/collections/building-blocks/create"
                className="w-full py-3 bg-transparent border border-primary text-primary rounded-lg text-sm font-label font-bold uppercase tracking-widest hover:bg-primary/5 transition-all no-underline flex items-center justify-center shadow-sm"
              >
                Create a Building Block
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
          >
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

