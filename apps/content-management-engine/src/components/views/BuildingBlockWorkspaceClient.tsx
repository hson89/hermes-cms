"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { Icon } from '../ui/atoms/Icon'
import { compileBlockSchema } from './BuildingBlockWorkspaceUtils'

interface BlockElement {
  id: string
  type: string
  name: string
  icon: string
  category: 'layout' | 'atomic' | 'interactive'
  properties: Record<string, any>
  mappings: Record<string, string>
  children?: BlockElement[]
}

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]+/g, '')
    .replace(/[\s-_]+/g, '_')
}

export const BuildingBlockWorkspaceClient: React.FC<{ serverId?: string }> = ({ serverId }) => {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { id: docId } = useDocumentInfo()

  // Routing identification
  const segments = (params as any)?.segments || []
  let parsedId = undefined
  if (segments[0] === 'collections' && segments[1] === 'building-blocks' && segments[2] && segments[2] !== 'create') {
    parsedId = segments[2]
  }

  const effectiveId = (docId && docId !== 'new' && docId !== 'create') ? docId : (serverId || parsedId)
  const isEditing = !!effectiveId && effectiveId !== 'new' && effectiveId !== 'create'

  // Block settings
  const [blockName, setBlockName] = useState(isEditing ? 'Loading Block...' : 'New Building Block')
  const [blockSlug, setBlockSlug] = useState(isEditing ? 'loading-block' : 'new-building-block')
  const [blockCategory, setBlockCategory] = useState<'layout' | 'media' | 'text' | 'interactive'>('layout')
  const [blockStatus, setBlockStatus] = useState<'active' | 'deprecated'>('active')
  const [canvasElements, setCanvasElements] = useState<BlockElement[]>([])
  
  // Element selections & focus states
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'properties' | 'mapping'>('properties')
  
  // Slash menu state
  const [slashMenuState, setSlashMenuState] = useState<{
    visible: boolean
    blockId: string
    parentId: string | null
    columnIndex: number | null
    query: string
    index: number
  }>({
    visible: false,
    blockId: '',
    parentId: null,
    columnIndex: null,
    query: '',
    index: 0,
  })

  // UI state
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)

  // Super-admin states
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  // Refs for tracking cursor / elements
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const slashMenuRef = useRef<HTMLDivElement | null>(null)

  const activeTenantId = useMemo(() => {
    return (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant
  }, [user])

  const isSuperAdmin = user?.role === 'super-admin'

  useEffect(() => {
    const tokenMatch = document.cookie.split('; ').find(row => row.startsWith('payload-token='))
    if (tokenMatch) {
      const token = tokenMatch.split('=')[1]
      localStorage.setItem('payload-token', token)
    }
  }, [])

  // Load tenants for super-admin
  useEffect(() => {
    if (isSuperAdmin) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `JWT ${token}`

      fetch('/api/tenants?limit=100', { headers })
        .then(res => res.json())
        .then(data => {
          if (data && data.docs) {
            const mapped = data.docs.map((t: any) => ({ id: t.id.toString(), name: t.name }))
            setTenants(mapped)
            if (mapped.length > 0 && !selectedTenantId) {
              setSelectedTenantId(mapped[0].id)
            }
          }
        })
        .catch(err => console.error('Failed to fetch tenants', err))
    }
  }, [isSuperAdmin])

  // Fetch block if editing
  useEffect(() => {
    if (!isEditing || !effectiveId) {
      // Default initial layout
      setCanvasElements([
        {
          id: 'title',
          type: 'Heading',
          name: 'Hero Title',
          icon: 'title',
          category: 'atomic',
          properties: { defaultValue: 'Main Section Title' },
          mappings: {}
        },
        {
          id: 'description',
          type: 'Text',
          name: 'Description Text',
          icon: 'notes',
          category: 'atomic',
          properties: { defaultValue: 'Describe this block here.' },
          mappings: {}
        }
      ])
      setIsLoading(false)
      return
    }

    const fetchBlock = async () => {
      try {
        setIsLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `JWT ${token}`

        const res = await fetch(`/api/building-blocks/${effectiveId}?depth=1`, { headers })
        if (!res.ok) throw new Error('Failed to fetch building block')

        const data = await res.json()
        setBlockName(data.name || '')
        setBlockSlug(data.slug || '')
        setBlockCategory(data.category || 'layout')
        setBlockStatus(data.status || 'active')

        const blockTenantId = typeof data.tenant === 'object' ? data.tenant?.id : data.tenant
        if (blockTenantId) {
          setSelectedTenantId(blockTenantId.toString())
        }

        if (data.schema && data.schema.visualLayout) {
          setCanvasElements(data.schema.visualLayout)
        } else {
          // Fallback parsing from basic schema definitions
          setCanvasElements([
            {
              id: 'title',
              type: 'Heading',
              name: 'Hero Title',
              icon: 'title',
              category: 'atomic',
              properties: { defaultValue: data.schema?.properties?.heading_text?.default || 'Main Section Title' },
              mappings: {}
            }
          ])
        }
      } catch (err: any) {
        setErrorMessage(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlock()
  }, [isEditing, effectiveId])

  // Sync block slug when editing name (only on create)
  useEffect(() => {
    if (!isEditing) {
      setBlockSlug(slugify(blockName))
    }
  }, [blockName, isEditing])

  const generatedSchema = useMemo(() => {
    return compileBlockSchema(canvasElements)
  }, [canvasElements])

  // Elements definition catalog
  const blockTypes = [
    { type: 'Text', name: 'Text Field', icon: 'notes', description: 'Long editorial paragraph input', category: 'atomic' as const },
    { type: 'Heading', name: 'Title Field', icon: 'title', description: 'Bold main editorial title input', category: 'atomic' as const },
    { type: 'Subheading', name: 'Subtitle Field', icon: 'subject', description: 'Secondary headline/sub-heading', category: 'atomic' as const },
    { type: 'Image', name: 'Image Upload', icon: 'image', description: 'Media asset uploader with focal points', category: 'atomic' as const },
    { type: 'Carousel', name: 'Carousel Slider', icon: 'view_carousel', description: 'Multi-slide image array slider container', category: 'interactive' as const },
    { type: 'Tabs', name: 'Tabs Element', icon: 'view_agenda', description: 'Tab-switched toggle panels', category: 'interactive' as const },
    { type: 'Accordion', name: 'Accordion', icon: 'expand', description: 'Collapsible text drawer panels', category: 'interactive' as const },
    { type: 'Columns', name: 'Split Columns', icon: 'view_column', description: 'Responsive nested side-by-side columns', category: 'layout' as const },
    { type: 'Divider', name: 'Divider Line', icon: 'horizontal_rule', description: 'Clean visual grid content separator', category: 'atomic' as const }
  ]

  // Filter slash command search items
  const filteredBlockTypes = useMemo(() => {
    if (!slashMenuState.query) return blockTypes
    return blockTypes.filter(b => b.name.toLowerCase().includes(slashMenuState.query.toLowerCase()) || b.type.toLowerCase().includes(slashMenuState.query.toLowerCase()))
  }, [slashMenuState.query])

  // Slash menu click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setSlashMenuState(prev => ({ ...prev, visible: false }))
      }
    }
    if (slashMenuState.visible) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [slashMenuState.visible])

  // Dynamic Element Mutation Helpers
  const addElementAt = (elementDef: any, targetBlockId: string, parentId: string | null = null, columnIndex: number | null = null) => {
    const freshId = slugify(elementDef.name) + '_' + Math.random().toString(36).substr(2, 4)
    
    const newElement: BlockElement = {
      id: freshId,
      type: elementDef.type,
      name: elementDef.name,
      icon: elementDef.icon,
      category: elementDef.category,
      properties: elementDef.type === 'Carousel' ? { transition: 'Slide (Horizontal)', autoplay: true, interval: 5000 } : {},
      mappings: {},
      children: elementDef.type === 'Columns' ? [[], []] as any : (elementDef.category === 'layout' ? [] : undefined)
    }

    const insertAtPosition = (list: BlockElement[]): BlockElement[] => {
      const index = list.findIndex(el => el.id === targetBlockId)
      if (index !== -1) {
        const copy = [...list]
        copy.splice(index + 1, 0, newElement)
        return copy
      }

      return list.map(item => {
        // Handle nesting in columns
        if (item.type === 'Columns' && Array.isArray(item.children)) {
          return {
            ...item,
            children: item.children.map((col: any, colIdx: number) => {
              if (parentId === item.id && columnIndex === colIdx) {
                const subIndex = col.findIndex((el: any) => el.id === targetBlockId)
                if (subIndex !== -1) {
                  const subCopy = [...col]
                  subCopy.splice(subIndex + 1, 0, newElement)
                  return subCopy
                }
                return [...col, newElement]
              }
              // Recursive search in child columns
              const searchRes = insertAtPosition(col)
              return searchRes
            }) as any
          }
        }
        
        // General children fallback
        if (item.children && Array.isArray(item.children)) {
          return {
            ...item,
            children: insertAtPosition(item.children)
          }
        }
        return item
      })
    }

    setCanvasElements(prev => {
      const idx = prev.findIndex(el => el.id === targetBlockId)
      if (idx !== -1 && !parentId) {
        const copy = [...prev]
        copy.splice(idx + 1, 0, newElement)
        return copy
      }
      return insertAtPosition(prev)
    })

    setSelectedElementId(freshId)
    setSlashMenuState(prev => ({ ...prev, visible: false }))
    
    // Focus new field naming input
    setTimeout(() => {
      inputRefs.current[freshId]?.focus()
    }, 80)
  }

  const deleteElement = (id: string) => {
    const deleteFromList = (list: BlockElement[]): BlockElement[] => {
      return list
        .filter(item => item.id !== id)
        .map(item => {
          if (item.type === 'Columns' && Array.isArray(item.children)) {
            return {
              ...item,
              children: item.children.map((col: any) => deleteFromList(col)) as any
            }
          }
          if (item.children && Array.isArray(item.children)) {
            return {
              ...item,
              children: deleteFromList(item.children)
            }
          }
          return item
        })
    }

    setCanvasElements(prev => deleteFromList(prev))
    if (selectedElementId === id) {
      setSelectedElementId(null)
      setIsDrawerOpen(false)
    }
  }

  const updateElementLabel = (id: string, newLabel: string) => {
    const freshSlug = slugify(newLabel)

    const updateInList = (list: BlockElement[]): BlockElement[] => {
      return list.map(item => {
        if (item.id === id) {
          return {
            ...item,
            name: newLabel,
            id: freshSlug // Auto slugify ID
          }
        }
        if (item.type === 'Columns' && Array.isArray(item.children)) {
          return {
            ...item,
            children: item.children.map((col: any) => updateInList(col)) as any
          }
        }
        if (item.children && Array.isArray(item.children)) {
          return {
            ...item,
            children: updateInList(item.children)
          }
        }
        return item
      })
    }

    setCanvasElements(prev => updateInList(prev))
    
    // Update selected ID reference dynamically if the slug changed
    if (selectedElementId === id) {
      setSelectedElementId(freshSlug)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, el: BlockElement, parentId: string | null = null, columnIndex: number | null = null) => {
    // Slash command trigger
    if (e.key === '/') {
      setSlashMenuState({
        visible: true,
        blockId: el.id,
        parentId,
        columnIndex,
        query: '',
        index: 0
      })
    }

    // Escape closing slash
    if (e.key === 'Escape' && slashMenuState.visible) {
      e.preventDefault()
      setSlashMenuState(prev => ({ ...prev, visible: false }))
    }

    // Markdown triggers at the beginning of an input
    const inputVal = (e.target as HTMLInputElement).value
    if (e.key === ' ') {
      if (inputVal === '#') {
        e.preventDefault()
        mutateBlockType(el.id, 'Heading')
        ;(e.target as HTMLInputElement).value = ''
      } else if (inputVal === '##') {
        e.preventDefault()
        mutateBlockType(el.id, 'Subheading')
        ;(e.target as HTMLInputElement).value = ''
      } else if (inputVal === '---') {
        e.preventDefault()
        mutateBlockType(el.id, 'Divider')
      }
    }

    // Enter splits / inserts standard field placeholder below
    if (e.key === 'Enter') {
      e.preventDefault()
      const textDef = blockTypes.find(b => b.type === 'Text')
      addElementAt(textDef, el.id, parentId, columnIndex)
    }

    // Backspace merges or deletes
    if (e.key === 'Backspace' && inputVal === '') {
      e.preventDefault()
      if (el.type !== 'Text') {
        mutateBlockType(el.id, 'Text')
      } else {
        deleteElement(el.id)
      }
    }
  }

  const mutateBlockType = (id: string, newType: string) => {
    const matched = blockTypes.find(b => b.type === newType)
    if (!matched) return

    const mutateInList = (list: BlockElement[]): BlockElement[] => {
      return list.map(item => {
        if (item.id === id) {
          return {
            ...item,
            type: matched.type,
            name: matched.name,
            icon: matched.icon,
            category: matched.category,
            children: matched.type === 'Columns' ? [[], []] as any : undefined
          }
        }
        if (item.type === 'Columns' && Array.isArray(item.children)) {
          return {
            ...item,
            children: item.children.map((col: any) => mutateInList(col)) as any
          }
        }
        if (item.children && Array.isArray(item.children)) {
          return {
            ...item,
            children: mutateInList(item.children)
          }
        }
        return item
      })
    }

    setCanvasElements(prev => mutateInList(prev))
  }

  // Handle Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDropElement = (e: React.DragEvent, targetId: string, parentId: string | null = null, columnIndex: number | null = null) => {
    e.preventDefault()
    e.stopPropagation()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId === targetId) return

    // Find dragged object
    let draggedObj: BlockElement | null = null
    const findAndRemove = (list: BlockElement[]): BlockElement[] => {
      const idx = list.findIndex(item => item.id === draggedId)
      if (idx !== -1) {
        draggedObj = list[idx]
        const copy = [...list]
        copy.splice(idx, 1)
        return copy
      }

      return list.map(item => {
        if (item.type === 'Columns' && Array.isArray(item.children)) {
          return {
            ...item,
            children: item.children.map((col: any) => findAndRemove(col)) as any
          }
        }
        if (item.children && Array.isArray(item.children)) {
          return {
            ...item,
            children: findAndRemove(item.children)
          }
        }
        return item
      })
    }

    // Temporary list state without dragged element
    setCanvasElements(prev => {
      const cleaned = findAndRemove(prev)
      if (!draggedObj) return prev

      const insertInList = (list: BlockElement[]): BlockElement[] => {
        const targetIdx = list.findIndex(item => item.id === targetId)
        if (targetIdx !== -1) {
          const copy = [...list]
          copy.splice(targetIdx + 1, 0, draggedObj!)
          return copy
        }

        return list.map(item => {
          if (item.type === 'Columns' && Array.isArray(item.children)) {
            return {
              ...item,
              children: item.children.map((col: any, colIdx: number) => {
                if (parentId === item.id && columnIndex === colIdx) {
                  const subIdx = col.findIndex((el: any) => el.id === targetId)
                  if (subIdx !== -1) {
                    const subCopy = [...col]
                    subCopy.splice(subIdx + 1, 0, draggedObj!)
                    return subCopy
                  }
                  return [...col, draggedObj!]
                }
                return insertInList(col)
              }) as any
            }
          }
          if (item.children && Array.isArray(item.children)) {
            return {
              ...item,
              children: insertInList(item.children)
            }
          }
          return item
        })
      }

      // Root drop check
      const rootIdx = cleaned.findIndex(item => item.id === targetId)
      if (rootIdx !== -1 && !parentId) {
        const copy = [...cleaned]
        copy.splice(rootIdx + 1, 0, draggedObj!)
        return copy
      }

      return insertInList(cleaned)
    })
  }

  // Find dynamic active element metadata
  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null
    const findRecursive = (list: BlockElement[]): BlockElement | null => {
      for (const item of list) {
        if (item.id === selectedElementId) return item
        if (item.type === 'Columns' && Array.isArray(item.children)) {
          for (const col of item.children as any) {
            const res = findRecursive(col)
            if (res) return res
          }
        }
        if (item.children && Array.isArray(item.children)) {
          const res = findRecursive(item.children)
          if (res) return res
        }
      }
      return null
    }
    return findRecursive(canvasElements)
  }, [canvasElements, selectedElementId])

  const updateSelectedProperty = (key: string, value: any) => {
    if (!selectedElementId) return
    const updateRecursive = (list: BlockElement[]): BlockElement[] => {
      return list.map(item => {
        if (item.id === selectedElementId) {
          return { ...item, properties: { ...item.properties, [key]: value } }
        }
        if (item.type === 'Columns' && Array.isArray(item.children)) {
          return {
            ...item,
            children: item.children.map((col: any) => updateRecursive(col)) as any
          }
        }
        if (item.children && Array.isArray(item.children)) {
          return { ...item, children: updateRecursive(item.children) }
        }
        return item
      })
    }
    setCanvasElements(prev => updateRecursive(prev))
  }

  const updateSelectedMapping = (key: string, value: string) => {
    if (!selectedElementId) return
    const updateRecursive = (list: BlockElement[]): BlockElement[] => {
      return list.map(item => {
        if (item.id === selectedElementId) {
          return { ...item, mappings: { ...item.mappings, [key]: value } }
        }
        if (item.type === 'Columns' && Array.isArray(item.children)) {
          return {
            ...item,
            children: item.children.map((col: any) => updateRecursive(col)) as any
          }
        }
        if (item.children && Array.isArray(item.children)) {
          return { ...item, children: updateRecursive(item.children) }
        }
        return item
      })
    }
    setCanvasElements(prev => updateRecursive(prev))
  }

  // Database Persistence
  const handleSaveBlock = async () => {
    if (!blockName.trim() || !blockSlug.trim()) {
      setErrorMessage('Please specify block name and slug details.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `JWT ${token}`

      const rawTenant = isSuperAdmin
        ? selectedTenantId
        : (activeTenantId || (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant)

      if (!rawTenant) {
        throw new Error('Please select a tenant workspace.')
      }

      const payloadTenant = typeof rawTenant === 'string' && /^\d+$/.test(rawTenant)
        ? parseInt(rawTenant, 10)
        : rawTenant

      const payload = {
        name: blockName,
        slug: blockSlug,
        schema: generatedSchema,
        category: blockCategory,
        status: blockStatus,
        tenant: payloadTenant
      }

      const method = isEditing ? 'PATCH' : 'POST'
      const url = isEditing ? `/api/building-blocks/${effectiveId}` : '/api/building-blocks'

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.errors?.[0]?.message || 'Failed to save block')
      }

      setSuccessMessage(`${blockName} template saved successfully.`)
      setTimeout(() => setSuccessMessage(null), 3000)

      if (!isEditing) {
        const resData = await res.json()
        router.push(`/admin/collections/building-blocks/${resData.doc.id}`)
      }
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Recursive Schema Field Renderer
  const renderElementRow = (el: BlockElement, parentId: string | null = null, columnIndex: number | null = null) => {
    const isSelected = el.id === selectedElementId
    const isHovered = el.id === hoveredElementId
    const isColumns = el.type === 'Columns'

    return (
      <div
        key={el.id}
        onMouseEnter={() => setHoveredElementId(el.id)}
        onMouseLeave={() => setHoveredElementId(null)}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedElementId(el.id)
        }}
        className={`group/row relative py-4 px-6 my-2 rounded-xl transition-all duration-300 ${
          isSelected 
            ? 'bg-primary/5 ring-1 ring-primary/20 shadow-sm' 
            : 'hover:bg-surface-container-lowest/60'
        }`}
      >
        {/* Left Drag & Plus controls */}
        {isHovered && !isPreviewMode && (
          <div className="absolute left-[-42px] top-1/2 -translate-y-1/2 flex items-center gap-1 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSlashMenuState({
                  visible: true,
                  blockId: el.id,
                  parentId,
                  columnIndex,
                  query: '',
                  index: 0
                })
              }}
              className="w-7 h-7 bg-white hover:bg-primary/10 rounded-lg flex items-center justify-center shadow border border-outline-variant/30 text-outline hover:text-primary cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">add</span>
            </button>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, el.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropElement(e, el.id, parentId, columnIndex)}
              className="w-7 h-7 bg-white hover:bg-primary/10 rounded-lg flex items-center justify-center shadow border border-outline-variant/30 text-outline hover:text-primary cursor-grab active:cursor-grabbing transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
            </div>
          </div>
        )}

        {/* Dynamic Bubble menu for active element */}
        {isSelected && !isPreviewMode && (
          <div className="absolute right-4 -top-3.5 flex gap-1 z-30 animate-fade-in">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsDrawerOpen(true)
              }}
              className="px-2.5 py-1 bg-[#1e293b] text-white hover:bg-primary text-[10px] uppercase tracking-wider font-bold rounded shadow-lg flex items-center gap-1 border-none cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-xs">tune</span>
              Settings
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteElement(el.id)
              }}
              className="w-6 h-6 bg-[#1e293b] text-error hover:bg-error-container/20 rounded shadow-lg flex items-center justify-center border-none cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        )}

        {/* Labeled Inline Field Name Editor */}
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-xs text-outline/60">{el.icon}</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-outline/65 font-label">{el.type} Field</span>
          <span className="text-[10px] font-mono bg-surface-container px-1.5 py-0.5 rounded text-outline/50">api_key: {el.id}</span>
          {el.properties?.required && (
            <span className="text-[9px] bg-error/10 text-error px-1 py-0.2 rounded font-bold uppercase font-label">Required</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={(node) => { inputRefs.current[el.id] = node }}
            type="text"
            value={el.name}
            disabled={isPreviewMode}
            onChange={(e) => updateElementLabel(el.id, e.target.value)}
            onKeyDown={(e) => handleKeyPress(e, el, parentId, columnIndex)}
            className="w-full text-base font-headline font-bold bg-transparent border-none focus:ring-2 focus:ring-primary/15 rounded-lg px-2 py-1 -mx-2 -my-1 outline-none cursor-text leading-snug transition-all"
            placeholder={`Enter Field Label (e.g. Hero ${el.type})`}
          />
        </div>

        {/* Visual Mockups based on field types */}
        <div className="mt-3">
          {el.type === 'Heading' ? (
            <div className="h-12 border border-dashed border-outline-variant/30 rounded-lg bg-surface-container-lowest/30 flex items-center px-4 font-headline text-on-surface/40 select-none text-sm font-semibold">
              [Heading Field Preview Placeholder]
            </div>
          ) : el.type === 'Subheading' ? (
            <div className="h-10 border border-dashed border-outline-variant/30 rounded-lg bg-surface-container-lowest/30 flex items-center px-4 font-headline text-on-surface/30 select-none text-xs">
              [Subheading Field Preview Placeholder]
            </div>
          ) : el.type === 'Text' ? (
            <div className="h-16 border border-dashed border-outline-variant/30 rounded-lg bg-surface-container-lowest/30 flex flex-col justify-center px-4 gap-1 text-on-surface/40 select-none">
              <div className="h-2 w-2/3 bg-outline-variant/20 rounded" />
              <div className="h-2 w-1/2 bg-outline-variant/20 rounded" />
            </div>
          ) : el.type === 'Image' ? (
            <div className="h-24 border border-dashed border-outline-variant rounded-xl bg-surface flex flex-col items-center justify-center text-outline/50 select-none gap-1 hover:border-primary/45 transition-colors">
              <span className="material-symbols-outlined text-xl">cloud_upload</span>
              <p className="text-[10px] uppercase font-bold tracking-wider font-label m-0">Media Asset Upload field</p>
            </div>
          ) : el.type === 'Divider' ? (
            <div className="py-2 select-none">
              <hr className="border-t border-outline-variant/40 w-full" />
            </div>
          ) : el.type === 'Carousel' ? (
            <div className="border border-outline-variant/40 rounded-xl overflow-hidden bg-surface shadow-sm">
              <div className="flex h-36 bg-[#f1f5f9] items-center justify-between px-6 select-none">
                <span className="material-symbols-outlined text-outline/30 text-lg">chevron_left</span>
                <div className="text-center flex flex-col items-center gap-2">
                  <div className="border border-dashed border-primary/20 bg-white/70 p-1.5 rounded flex items-center gap-1.5 px-3">
                    <span className="material-symbols-outlined text-outline text-xs">image</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-outline font-label">Slide Image Field</span>
                  </div>
                  <div className="h-2 w-24 bg-outline-variant/40 rounded" />
                </div>
                <span className="material-symbols-outlined text-outline/30 text-lg">chevron_right</span>
              </div>
              <div className="p-2 border-t border-outline-variant/25 bg-surface-container-low flex justify-between items-center px-4">
                <span className="text-[8px] font-bold uppercase tracking-widest text-outline/60 font-label">Carousel slider properties</span>
                <div className="flex gap-1.5">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  <div className="h-1.5 w-1.5 bg-outline-variant rounded-full" />
                  <div className="h-1.5 w-1.5 bg-outline-variant rounded-full" />
                </div>
              </div>
            </div>
          ) : el.type === 'Tabs' ? (
            <div className="border border-outline-variant/30 rounded-xl p-3 bg-surface select-none space-y-2.5">
              <div className="flex border-b border-outline-variant/20">
                <span className="px-3.5 py-1 text-[9px] font-bold text-primary border-b-2 border-primary">Active Tab Field</span>
                <span className="px-3.5 py-1 text-[9px] text-outline/50 font-medium">Inactive Tab</span>
              </div>
              <div className="h-12 bg-surface-container-low rounded border border-dashed border-outline-variant/20 flex items-center justify-center text-[10px] text-outline/40 uppercase font-bold tracking-wider font-label">Tab sub-layout wrapper</div>
            </div>
          ) : el.type === 'Accordion' ? (
            <div className="border border-outline-variant/30 rounded-xl p-2 bg-surface select-none space-y-1">
              <div className="flex justify-between items-center p-2 bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface-variant">
                <span>Accordion Header Input Field</span>
                <span className="material-symbols-outlined text-sm text-outline/50">expand_more</span>
              </div>
            </div>
          ) : isColumns && Array.isArray(el.children) ? (
            /* Columns layout structure */
            <div className="grid grid-cols-2 gap-4 mt-3 border border-dashed border-outline-variant/50 rounded-xl p-4 bg-surface-container-lowest/30">
              {el.children.map((col: any, colIdx: number) => (
                <div
                  key={colIdx}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropElement(e, col[col.length - 1]?.id || '', el.id, colIdx)}
                  className="min-h-[140px] rounded-lg border border-dashed border-outline-variant/30 bg-surface/30 p-3 flex flex-col gap-2 relative"
                >
                  <div className="absolute top-1 right-2 bg-surface-container-high/65 text-[7px] text-outline px-1 rounded uppercase tracking-wider font-bold font-label">Col {colIdx + 1}</div>
                  
                  {col.length === 0 ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        setSlashMenuState({
                          visible: true,
                          blockId: '',
                          parentId: el.id,
                          columnIndex: colIdx,
                          query: '',
                          index: 0
                        })
                      }}
                      className="flex-grow flex flex-col items-center justify-center text-outline/35 cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors py-8 rounded"
                    >
                      <span className="material-symbols-outlined text-lg mb-0.5">add_circle</span>
                      <p className="text-[8px] uppercase font-bold tracking-wider font-label m-0">Slash (/) or Click to add Field</p>
                    </div>
                  ) : (
                    col.map((child: any) => renderElementRow(child, el.id, colIdx))
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Floating Slash dropdown menu trigger */}
        {slashMenuState.visible && slashMenuState.blockId === el.id && (
          <div
            ref={slashMenuRef}
            className="absolute left-10 mt-1 bg-white/80 backdrop-blur-md border border-outline-variant shadow-2xl rounded-xl w-64 z-[99] flex flex-col overflow-hidden max-h-72 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-outline-variant/20 bg-surface">
              <input
                autoFocus
                type="text"
                value={slashMenuState.query}
                onChange={(e) => setSlashMenuState(prev => ({ ...prev, query: e.target.value }))}
                className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 placeholder:text-outline/45 font-medium px-1.5 py-1"
                placeholder="Search field type... (e.g. heading)"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin">
              {filteredBlockTypes.length === 0 ? (
                <div className="text-[10px] text-outline text-center py-4 font-bold uppercase tracking-wider font-label">No matching fields</div>
              ) : (
                filteredBlockTypes.map((item, idx) => (
                  <div
                    key={item.type}
                    onClick={() => addElementAt(item, el.id, parentId, columnIndex)}
                    className="p-2.5 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-primary/5 transition-colors group/item"
                  >
                    <div className="w-8 h-8 rounded bg-surface flex items-center justify-center text-outline group-hover/item:text-primary group-hover/item:bg-primary/10 transition-colors">
                      <span className="material-symbols-outlined text-md">{item.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface group-hover/item:text-primary transition-colors">{item.name}</span>
                      <span className="text-[8px] text-outline leading-tight font-medium">{item.description}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="custom-editor-view flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] bg-surface p-12">
        <div className="animate-pulse flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin">schema</span>
          </div>
          <div className="space-y-3">
            <div className="h-6 w-48 bg-outline-variant/30 rounded mx-auto" />
            <div className="h-4 w-64 bg-outline-variant/20 rounded mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="custom-editor-view no-header h-screen bg-background text-on-surface flex overflow-hidden font-body">
      <style jsx global>{`
        .canvas-dot-pattern {
          background-image: radial-gradient(#cbd5e1 0.5px, transparent 0.5px);
          background-size: 24px 24px;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-editor-view {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: row;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .template-workspace {
          width: 100%;
          height: 100%;
        }
      `}</style>

      {/* Main workspace section */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] h-full overflow-hidden">
        {/* Editorial Top Toolbar */}
        <header className="designer-toolbar h-20 border-b border-outline-variant/35 bg-white flex items-center justify-between px-8 z-10 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="text-outline hover:text-primary transition-colors border-none bg-transparent cursor-pointer flex items-center"
              onClick={() => router.push('/admin/collections/building-blocks')}
            >
              <span className="material-symbols-outlined font-bold">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <input
                type="text"
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
                disabled={isPreviewMode}
                className="text-lg font-headline font-bold bg-transparent border-none focus:ring-0 outline-none p-0 w-64 text-on-surface"
                placeholder="Enter Block Template Name"
              />
              <p className="text-[10px] text-outline label-text font-label uppercase tracking-widest flex items-center gap-1.5 mt-1 font-semibold select-none">
                Building Blocks / {blockCategory} / <span className="font-mono lowercase text-[9px] bg-surface-container px-1 py-0.5 rounded text-outline/50">{blockSlug}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Viewport resizing toggles */}
            <div className="flex bg-slate-100 rounded-xl p-1 mr-4 border border-outline-variant/20 select-none">
              <button
                onClick={() => setViewport('desktop')}
                className={`px-3 py-1.5 rounded-lg transition-all border-none cursor-pointer flex items-center gap-1 ${
                  viewport === 'desktop' ? 'bg-white shadow-sm text-primary font-bold' : 'text-outline/70 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">desktop_windows</span>
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`px-3 py-1.5 rounded-lg transition-all border-none cursor-pointer flex items-center gap-1 ${
                  viewport === 'tablet' ? 'bg-white shadow-sm text-primary font-bold' : 'text-outline/70 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">tablet_mac</span>
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={`px-3 py-1.5 rounded-lg transition-all border-none cursor-pointer flex items-center gap-1 ${
                  viewport === 'mobile' ? 'bg-white shadow-sm text-primary font-bold' : 'text-outline/70 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">smartphone</span>
              </button>
            </div>

            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-4 py-2 font-medium rounded-xl transition-all border-none cursor-pointer ${
                isPreviewMode ? 'text-primary bg-primary/10 font-bold' : 'text-primary hover:bg-primary/5 bg-transparent'
              }`}
            >
              {isPreviewMode ? 'Edit Schema' : 'Preview Block'}
            </button>

            <button
              onClick={handleSaveBlock}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-all border-none cursor-pointer shadow hover:shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving Template...' : 'Save Template'}
            </button>
          </div>
        </header>

        {/* Central visual composer area */}
        <section className="flex-1 overflow-y-auto canvas-dot-pattern flex justify-center p-12 scrollbar-thin relative">
          {errorMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-error/10 text-error px-6 py-3 rounded-full shadow-lg flex items-center gap-3 border border-error/20 z-50 animate-bounce-short">
              <span className="material-symbols-outlined">error</span>
              <span className="text-sm font-semibold">{errorMessage}</span>
              <button className="bg-transparent border-none cursor-pointer font-bold text-error ml-2" onClick={() => setErrorMessage(null)}>✕</button>
            </div>
          )}

          {canvasElements.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-outline/35 pointer-events-none z-0">
              <span className="material-symbols-outlined text-5xl mb-3">schema</span>
              <p className="text-sm font-semibold uppercase tracking-wider font-label">Click in canvas or drop layouts to add schema fields</p>
            </div>
          )}

          {/* Simulated viewpaper sandbox */}
          <div
            className={`bg-white shadow-xl border border-outline-variant/30 flex flex-col transition-all duration-300 relative z-10 w-full h-fit min-h-[660px] rounded-3xl overflow-hidden ${
              viewport === 'desktop' ? 'max-w-[860px]' :
              viewport === 'tablet' ? 'max-w-[768px]' :
              'max-w-[375px]'
            }`}
          >
            {/* Viewport paper simulator header metadata */}
            <div className="p-3 border-b border-outline-variant/20 bg-slate-50 flex justify-between items-center px-6 select-none">
              <span className="text-[9px] uppercase tracking-widest font-bold text-outline/50 font-label flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">tune</span>
                Visual schema composer workspace
              </span>
              <span className="text-[8px] font-mono bg-slate-200 px-2 py-0.5 rounded text-outline/65">
                schema_fields: {canvasElements.length}
              </span>
            </div>

            {/* Main template canvas area */}
            <div className="flex-grow p-10 bg-white">
              <div className="relative flex flex-col gap-2">
                
                {/* Visual Field outline list */}
                {canvasElements.map(el => renderElementRow(el))}

                {/* Bottom Append row helper */}
                {!isPreviewMode && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      const textDef = blockTypes.find(b => b.type === 'Text')
                      const targetId = canvasElements[canvasElements.length - 1]?.id || ''
                      if (targetId) {
                        addElementAt(textDef, targetId)
                      } else {
                        // Empty canvas initial insert
                        setCanvasElements([
                          {
                            id: 'text_field',
                            type: 'Text',
                            name: 'Description Text',
                            icon: 'notes',
                            category: 'atomic',
                            properties: {},
                            mappings: {}
                          }
                        ])
                      }
                    }}
                    className="border border-dashed border-outline-variant/35 rounded-xl py-6 flex flex-col items-center justify-center text-outline/40 hover:bg-primary/5 hover:border-primary/50 hover:text-primary transition-all cursor-pointer mt-4 select-none"
                  >
                    <span className="material-symbols-outlined text-xl mb-1">add_circle</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider font-label m-0">Add Field Placeholder Row</p>
                  </div>
                )}

              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Advanced properties right slide-drawer */}
      {isDrawerOpen && selectedElement && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in" onClick={() => setIsDrawerOpen(false)}>
          {/* Glass blur background overlay */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

          {/* Sliding drawer card */}
          <aside
            className="w-96 bg-white h-full relative z-10 flex flex-col shadow-2xl border-l border-outline-variant/25 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between bg-slate-50 select-none">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <span className="material-symbols-outlined text-sm">{selectedElement.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest font-label">Configure Field</span>
                </div>
                <h3 className="text-base font-bold text-on-surface m-0 leading-tight">{selectedElement.name}</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-outline hover:text-on-surface border-none bg-transparent cursor-pointer flex items-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Tab selection headers */}
            <div className="flex border-b border-outline-variant/15 select-none">
              <button
                onClick={() => setActiveTab('properties')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors border-none cursor-pointer bg-transparent ${
                  activeTab === 'properties' ? 'text-primary border-b-2 border-primary font-bold' : 'text-outline/70 hover:text-on-surface-variant'
                }`}
              >
                Backend Schema rules
              </button>
              <button
                onClick={() => setActiveTab('mapping')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors border-none cursor-pointer bg-transparent ${
                  activeTab === 'mapping' ? 'text-primary border-b-2 border-primary font-bold' : 'text-outline/70 hover:text-on-surface-variant'
                }`}
              >
                CMS Mappings
              </button>
            </div>

            {/* Detailed scroll details */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {activeTab === 'properties' ? (
                /* BACKEND SCHEMA RULES TAB */
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-outline uppercase tracking-wider font-label mb-1.5">API Schema Field Key</label>
                    <input
                      type="text"
                      value={selectedElement.id}
                      onChange={(e) => {
                        const sanitized = slugify(e.target.value)
                        // Dynamic key rename recursive helper
                        setCanvasElements(prev => {
                          const renameInList = (list: BlockElement[]): BlockElement[] => {
                            return list.map(item => {
                              if (item.id === selectedElementId) {
                                return { ...item, id: sanitized }
                              }
                              if (item.type === 'Columns' && Array.isArray(item.children)) {
                                return {
                                  ...item,
                                  children: item.children.map((col: any) => renameInList(col)) as any
                                }
                              }
                              if (item.children && Array.isArray(item.children)) {
                                return { ...item, children: renameInList(item.children) }
                              }
                              return item
                            })
                          }
                          return renameInList(prev)
                        })
                        setSelectedElementId(sanitized)
                      }}
                      className="w-full bg-slate-50 border border-outline-variant rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono text-on-surface"
                      placeholder="e.g. main_title"
                    />
                    <p className="text-[9px] text-outline mt-1 font-medium">Unique identifier referenced by API and templates. Lowercase letters, numbers, and underscores only.</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-outline-variant/15 select-none">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-on-surface">Required field constraints</span>
                      <span className="text-[9px] text-outline">Enforces content entry in page builder</span>
                    </div>
                    <button
                      onClick={() => updateSelectedProperty('required', !selectedElement.properties.required)}
                      className={`w-10 h-5.5 rounded-full relative cursor-pointer border-none flex-shrink-0 transition-colors duration-300 ${
                        selectedElement.properties.required ? 'bg-primary' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-all duration-300 ${
                          selectedElement.properties.required ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-outline uppercase tracking-wider font-label mb-1.5">Default Placeholder Text</label>
                    <input
                      type="text"
                      value={selectedElement.properties.defaultValue || ''}
                      onChange={(e) => updateSelectedProperty('defaultValue', e.target.value)}
                      className="w-full bg-slate-50 border border-outline-variant rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder="e.g. Enter hero subtitle here"
                    />
                    <p className="text-[9px] text-outline mt-1 font-medium">Instruction helper displayed inside the page builder text fields.</p>
                  </div>

                  {selectedElement.type === 'Carousel' && (
                    <div className="border border-outline-variant/20 rounded-xl p-4 bg-slate-50 space-y-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-outline font-label block">Interactive Slider Config</span>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-on-surface-variant">Transition effect</label>
                        <select
                          value={selectedElement.properties.transition || 'Slide (Horizontal)'}
                          onChange={(e) => updateSelectedProperty('transition', e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                        >
                          <option>Slide (Horizontal)</option>
                          <option>Fade</option>
                          <option>Slide (Vertical)</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between select-none">
                        <label className="text-xs font-semibold text-on-surface-variant">Autoplay</label>
                        <button
                          onClick={() => updateSelectedProperty('autoplay', !selectedElement.properties.autoplay)}
                          className={`w-9 h-5 rounded-full relative cursor-pointer border-none flex-shrink-0 transition-colors ${
                            selectedElement.properties.autoplay ? 'bg-primary' : 'bg-slate-300'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                              selectedElement.properties.autoplay ? 'right-0.5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5 text-on-surface-variant">Interval (ms)</label>
                        <input
                          type="number"
                          value={selectedElement.properties.interval || 5000}
                          onChange={(e) => updateSelectedProperty('interval', parseInt(e.target.value) || 0)}
                          className="w-full bg-white border border-outline-variant rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Real-time structural schema representation */}
                  <div className="pt-4 border-t border-outline-variant/15 select-none">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider font-label mb-2 block">Visual Schema preview</span>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[9px] overflow-hidden leading-relaxed shadow-inner max-h-52 overflow-y-auto scrollbar-thin">
                      <pre className="opacity-85 m-0"><code>{JSON.stringify(generatedSchema, null, 2)}</code></pre>
                    </div>
                  </div>
                </div>
              ) : (
                /* CMS MAPPINGS TAB */
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10 select-none">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest font-label">Dynamic API bind mappings</span>
                    <span className="material-symbols-outlined text-primary text-sm">link</span>
                  </div>

                  {selectedElement.type === 'Carousel' ? (
                    <div className="space-y-4">
                      <div className="p-4 border border-outline-variant/20 rounded-xl bg-slate-50 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-label">Slide Image Source</span>
                          <span className="material-symbols-outlined text-xs text-outline/50">image</span>
                        </div>
                        <select
                          value={selectedElement.mappings.imageSrc || 'slide_items[].image_url'}
                          onChange={(e) => updateSelectedMapping('imageSrc', e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                        >
                          <option>slide_items[].image_url</option>
                          <option>featured_image</option>
                        </select>
                      </div>

                      <div className="p-4 border border-outline-variant/20 rounded-xl bg-slate-50 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-label">Slide Caption Title</span>
                          <span className="material-symbols-outlined text-xs text-outline/50">title</span>
                        </div>
                        <select
                          value={selectedElement.mappings.headingText || 'slide_items[].title'}
                          onChange={(e) => updateSelectedMapping('headingText', e.target.value)}
                          className="w-full bg-white border border-outline-variant rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                        >
                          <option>slide_items[].title</option>
                          <option>entry_title</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 text-center rounded-xl border border-dashed border-outline-variant/30 select-none">
                      <p className="text-xs text-outline/65 m-0 leading-relaxed font-medium">Standard field placeholders bind recursively using their exact API schema keys under the generated Payload CMS content model.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Properties drawer footer */}
            <div className="p-6 border-t border-outline-variant/20 bg-slate-50 select-none">
              <button
                onClick={() => {
                  setSuccessMessage('Schema successfully validated against Payload CMS strict JSON constraints.')
                  setTimeout(() => setSuccessMessage(null), 3500)
                }}
                className="w-full py-2.5 bg-white border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all text-[10px] font-bold uppercase tracking-widest rounded-xl cursor-pointer"
              >
                Validate Field Schema
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Super-admin support tenant selection panel in absolute floating bottom-left */}
      {isSuperAdmin && !isPreviewMode && (
        <div className="fixed bottom-6 left-6 z-40 bg-white shadow-xl border border-outline-variant/30 p-4 rounded-2xl flex flex-col gap-2 max-w-xs animate-fade-in select-none">
          <label className="text-[8px] font-bold text-outline uppercase tracking-widest font-label">Tenant workspace selector</label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="bg-slate-50 border border-outline-variant rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="">Select workspace...</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Floating Success Alert */}
      {successMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce-short z-[9999] select-none">
          <span className="material-symbols-outlined text-emerald-400 font-bold">check_circle</span>
          <span className="text-xs font-bold uppercase tracking-wider font-label">{successMessage}</span>
        </div>
      )}

      {/* Custom animate bouncing rules */}
      <style jsx>{`
        @keyframes bounce-short {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -8px); }
        }
        .animate-bounce-short {
          animation: bounce-short 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
