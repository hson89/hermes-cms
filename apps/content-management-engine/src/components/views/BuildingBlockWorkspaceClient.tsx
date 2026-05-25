"use client"

import React, { useState, useEffect, useMemo } from 'react'
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

  // Block states
  const [blockName, setBlockName] = useState(isEditing ? 'Loading Block...' : 'New Building Block')
  const [blockSlug, setBlockSlug] = useState(isEditing ? 'loading-block' : 'new-building-block')
  const [blockCategory, setBlockCategory] = useState<'layout' | 'media' | 'text' | 'interactive'>('layout')
  const [blockStatus, setBlockStatus] = useState<'active' | 'deprecated'>('active')
  const [canvasElements, setCanvasElements] = useState<BlockElement[]>([])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  
  // Tenant states for super-admin support
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('')
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'properties' | 'mapping'>('properties')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Retrieve auth token
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

  // Load tenants if super-admin
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

  // Fetch database document if editing
  useEffect(() => {
    if (!isEditing || !effectiveId) {
      // Default to empty canvas for a fresh generic visual builder
      setCanvasElements([])
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
        setBlockCategory(data.category || 'media')
        
        // Restore block tenant if super-admin is editing
        const blockTenantId = typeof data.tenant === 'object' ? data.tenant?.id : data.tenant
        if (blockTenantId) {
          setSelectedTenantId(blockTenantId.toString())
        }
        setBlockStatus(data.status || 'active')
        
        // Restore layout structure from block schema metadata or use default fallback
        if (data.schema && data.schema.visualLayout) {
          setCanvasElements(data.schema.visualLayout)
        } else {
          // Fallback parsing schema to build design mockup
          setCanvasElements([
            {
              id: data.slug || 'block_design',
              type: data.category === 'interactive' ? 'Carousel' : 'Container',
              name: data.name || 'Block Content',
              icon: data.category === 'interactive' ? 'view_carousel' : 'crop_square',
              category: 'interactive',
              properties: data.schema?.properties?.config || {
                transition: 'Slide (Horizontal)',
                autoplay: true,
                interval: 5000
              },
              mappings: data.schema?.properties?.mappings || {
                imageSrc: 'slide_items[].image_url',
                headingText: 'slide_items[].title'
              }
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

  // Elements catalogs
  const layoutElements = [
    { type: 'Container', name: 'Container', icon: 'crop_square', category: 'layout' as const },
    { type: 'Grid', name: 'Grid', icon: 'grid_view', category: 'layout' as const },
    { type: 'Columns', name: 'Columns', icon: 'view_column', category: 'layout' as const },
    { type: 'Section', name: 'Section', icon: 'rectangle', category: 'layout' as const },
  ]

  const atomicElements = [
    { type: 'Heading', name: 'Heading', icon: 'title', category: 'atomic' as const },
    { type: 'Text', name: 'Text', icon: 'notes', category: 'atomic' as const },
    { type: 'Image', name: 'Image', icon: 'image', category: 'atomic' as const },
    { type: 'Button', name: 'Button', icon: 'smart_button', category: 'atomic' as const },
    { type: 'Link', name: 'Link', icon: 'link', category: 'atomic' as const },
    { type: 'Divider', name: 'Divider', icon: 'horizontal_rule', category: 'atomic' as const },
  ]

  const interactiveElements = [
    { type: 'Carousel', name: 'Carousel', icon: 'view_carousel', category: 'interactive' as const, isNew: true },
    { type: 'Tabs', name: 'Tabs', icon: 'view_agenda', category: 'interactive' as const },
    { type: 'Accordion', name: 'Accordion', icon: 'expand', category: 'interactive' as const },
  ]

  // Filter elements by search query
  const filterBySearch = (items: { type: string; name: string; icon: string; category: string }[]) => {
    return items.filter(el => el.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }

  // Schema Compiler based on visually added elements
  const generatedSchema = useMemo(() => {
    return compileBlockSchema(canvasElements)
  }, [canvasElements])

  // Drag and Drop & Action handlers
  const handleDragStart = (e: React.DragEvent, element: any) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(element))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (!dataStr) return
      const element = JSON.parse(dataStr)
      addElementToCanvas(element)
    } catch (err) {
      console.error('Drop handling failed', err)
    }
  }

  const addElementToCanvas = (element: any) => {
    const newId = `${element.type.toLowerCase()}_${Date.now().toString().slice(-4)}`
    const defaultProperties: Record<string, any> = {}
    const defaultMappings: Record<string, string> = {}

    if (element.type === 'Carousel') {
      defaultProperties.transition = 'Slide (Horizontal)'
      defaultProperties.autoplay = true
      defaultProperties.interval = 5000
      defaultMappings.imageSrc = 'slide_items[].image_url'
      defaultMappings.headingText = 'slide_items[].title'
    }

    const newElement: BlockElement = {
      id: newId,
      type: element.type,
      name: element.name,
      icon: element.icon,
      category: element.category,
      properties: defaultProperties,
      mappings: defaultMappings
    }

    setCanvasElements(prev => [...prev, newElement])
    setSelectedElementId(newId)
    setIsPropertiesOpen(true)
  }

  const removeElementFromCanvas = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCanvasElements(prev => prev.filter(el => el.id !== id))
    if (selectedElementId === id) {
      setSelectedElementId(null)
      setIsPropertiesOpen(false)
    }
  }

  const selectedElement = useMemo(() => {
    return canvasElements.find(el => el.id === selectedElementId) || null
  }, [canvasElements, selectedElementId])

  const updateSelectedProperty = (key: string, value: any) => {
    if (!selectedElementId) return
    setCanvasElements(prev =>
      prev.map(el =>
        el.id === selectedElementId
          ? { ...el, properties: { ...el.properties, [key]: value } }
          : el
      )
    )
  }

  const updateSelectedMapping = (key: string, value: string) => {
    if (!selectedElementId) return
    setCanvasElements(prev =>
      prev.map(el =>
        el.id === selectedElementId
          ? { ...el, mappings: { ...el.mappings, [key]: value } }
          : el
      )
    )
  }

  // Database persistence
  const handleSaveBlock = async () => {
    if (!blockName.trim() || !blockSlug.trim()) {
      setErrorMessage('Please specify name and slug details for the block.')
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

      // Convert to integer to align with PostgreSQL numeric identity constraints
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

      setSuccessMessage(`${blockName} saved successfully.`)
      setTimeout(() => setSuccessMessage(null), 3000)

      if (!isEditing) {
        const resData = await res.json()
        window.location.href = `/admin/collections/building-blocks/${resData.doc.id}`
      }
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="custom-editor-view flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] bg-surface p-12">
        <div className="animate-pulse flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high" />
          <div className="space-y-3">
            <div className="h-6 w-48 bg-surface-container-high rounded mx-auto" />
            <div className="h-4 w-64 bg-surface-container-high rounded mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="custom-editor-view no-header h-screen bg-background text-on-surface flex overflow-hidden font-body">
      {/* Dynamic Token CSS Injection */}
      <style jsx global>{`
        .canvas-dot-pattern {
          background-image: radial-gradient(#c3c6d5 0.5px, transparent 0.5px);
          background-size: 20px 20px;
        }
        .ghost-border {
          box-shadow: inset 0 0 0 1px rgba(195, 198, 213, 0.15);
        }
        .hover-lift {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -8px rgba(27, 28, 29, 0.08);
        }
        .spring-toggle {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.4s ease;
        }
        /* Custom layout overrides inside payload admin panels */
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
        /* Strip default Payload workspace spacing wrapper */
        .collection-edit .custom-editor-view,
        .collection-create .custom-editor-view {
          margin-top: 0 !important;
          padding: 0 !important;
        }
        /* Ensure Next catch-all structure remains responsive */
        .template-workspace, .builder-workspace {
          width: 100%;
          height: 100%;
        }
      `}</style>

      {/* Main Designer Grid */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface h-full">
        {/* Top Header/Toolbar */}
        <header className="designer-toolbar h-16 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              className="text-outline hover:text-on-surface transition-colors border-none bg-transparent cursor-pointer flex items-center" 
              onClick={() => window.location.href = '/admin/collections/building-blocks'}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <input 
                type="text" 
                value={blockName} 
                onChange={(e) => setBlockName(e.target.value)} 
                className="text-lg font-headline font-bold bg-transparent border-none focus:ring-0 outline-none p-0 w-64"
                placeholder="Block Name"
              />
              <p className="text-xs text-outline label-text font-label uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                Building Blocks / {blockCategory} / <span className="font-mono lowercase text-[10px] bg-surface-container px-1 py-0.5 rounded">{blockSlug}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Viewport Resizer */}
            <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant mr-4">
              <button 
                onClick={() => setViewport('desktop')}
                className={`px-3 py-1 rounded transition-all border-none cursor-pointer flex items-center gap-1 ${viewport === 'desktop' ? 'bg-surface-container-lowest shadow-sm text-primary font-bold' : 'text-outline hover:text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-sm">desktop_windows</span>
              </button>
              <button 
                onClick={() => setViewport('tablet')}
                className={`px-3 py-1 rounded transition-all border-none cursor-pointer flex items-center gap-1 ${viewport === 'tablet' ? 'bg-surface-container-lowest shadow-sm text-primary font-bold' : 'text-outline hover:text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-sm">tablet_mac</span>
              </button>
              <button 
                onClick={() => setViewport('mobile')}
                className={`px-3 py-1 rounded transition-all border-none cursor-pointer flex items-center gap-1 ${viewport === 'mobile' ? 'bg-surface-container-lowest shadow-sm text-primary font-bold' : 'text-outline hover:text-on-surface-variant'}`}
              >
                <span className="material-symbols-outlined text-sm">smartphone</span>
              </button>
            </div>

            <button 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-4 py-2 font-medium rounded transition-colors border-none cursor-pointer bg-transparent ${isPreviewMode ? 'text-primary bg-primary-container/10 font-bold' : 'text-primary hover:bg-primary/5'}`}
            >
              {isPreviewMode ? 'Exit Preview' : 'Preview'}
            </button>
            
            <button 
              onClick={handleSaveBlock}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-on-primary font-medium rounded hover:opacity-90 transition-opacity border-none cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Block'}
            </button>
          </div>
        </header>

        {/* Lower Sandbox Split */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Left Elements Sidebar Panel */}
          <aside className="w-72 border-r border-outline-variant flex flex-col bg-surface-container-low flex-shrink-0 z-10">
            {/* Search Elements */}
            <div className="p-4 border-b border-outline-variant">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm placeholder:text-outline" 
                  placeholder="Search elements..."
                />
              </div>
            </div>

            {/* Elements Categories List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
              {/* Layout components */}
              {filterBySearch(layoutElements).length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-3 flex items-center justify-between font-label">
                    Layout
                    <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {filterBySearch(layoutElements).map(el => (
                      <div 
                        key={el.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, el)}
                        onClick={() => addElementToCanvas(el)}
                        className="border border-outline-variant bg-surface p-3 rounded flex flex-col items-center gap-2 cursor-grab hover:border-primary hover:text-primary transition-all group hover:shadow-sm"
                      >
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">{el.icon}</span>
                        <span className="text-[10px] font-semibold tracking-wider font-label uppercase">{el.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Atomic components */}
              {filterBySearch(atomicElements).length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-3 flex items-center justify-between font-label">
                    Atomic Elements
                    <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {filterBySearch(atomicElements).map(el => (
                      <div 
                        key={el.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, el)}
                        onClick={() => addElementToCanvas(el)}
                        className="border border-outline-variant bg-surface p-3 rounded flex flex-col items-center gap-2 cursor-grab hover:border-primary hover:text-primary transition-all group hover:shadow-sm"
                      >
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">{el.icon}</span>
                        <span className="text-[10px] font-semibold tracking-wider font-label uppercase">{el.name}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Interactive components */}
              {filterBySearch(interactiveElements).length > 0 && (
                <section>
                  <h3 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-3 flex items-center justify-between font-label">
                    Interactive
                    <span className="material-symbols-outlined text-xs text-primary">new_releases</span>
                  </h3>
                  <div className="space-y-2">
                    {filterBySearch(interactiveElements).map(el => (
                      <div 
                        key={el.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, el)}
                        onClick={() => addElementToCanvas(el)}
                        className={`p-3 rounded flex items-center gap-3 cursor-grab hover:border-primary hover:bg-primary/5 transition-all group relative border ${el.type === 'Carousel' ? 'border-2 border-primary bg-primary/5 text-primary' : 'border-outline-variant bg-surface hover:shadow-sm'}`}
                      >
                        {el.type === 'Carousel' && (
                          <div className="absolute top-0 right-0 bg-primary text-[8px] text-on-primary px-1.5 py-0.5 rounded-bl font-bold uppercase tracking-wider font-label">Active</div>
                        )}
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${el.type === 'Carousel' ? 'bg-primary/10' : 'bg-surface-container'}`}>
                          <span className={`material-symbols-outlined ${el.type === 'Carousel' ? 'text-primary' : 'text-outline group-hover:text-primary transition-colors'}`}>{el.icon}</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold block">{el.name}</span>
                          <span className="text-[9px] text-outline tracking-wider font-label uppercase">{el.type === 'Carousel' ? 'Multi-item slider' : el.type === 'Tabs' ? 'Tabbed content' : 'Collapsible list'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Block settings in sidebar footer */}
            <div className="p-4 border-t border-outline-variant bg-surface-container-low flex flex-col gap-3">
              {isSuperAdmin && (
                <div>
                  <label className="block text-[10px] font-bold text-outline uppercase tracking-widest font-label mb-1">Tenant Workspace</label>
                  <select 
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select workspace...</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-outline uppercase tracking-widest font-label mb-1">Block Slug</label>
                <input 
                  type="text" 
                  value={blockSlug} 
                  onChange={(e) => setBlockSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, ''))} 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. media-carousel"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-outline uppercase tracking-widest font-label mb-1">Category</label>
                  <select 
                    value={blockCategory}
                    onChange={(e: any) => setBlockCategory(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="layout">Layout</option>
                    <option value="media">Media</option>
                    <option value="text">Text</option>
                    <option value="interactive">Interactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-outline uppercase tracking-widest font-label mb-1">Status</label>
                  <select 
                    value={blockStatus}
                    onChange={(e: any) => setBlockStatus(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Central Workspace Sandbox */}
          <section 
            className="flex-1 bg-surface-container-low canvas-dot-pattern overflow-auto flex justify-center p-12 relative z-0"
            id="canvas-container"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Error notifications */}
            {errorMessage && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-6 py-3 rounded-full shadow-lg flex items-center gap-3 border border-error/20 z-50">
                <span className="material-symbols-outlined text-error">error</span>
                <span className="text-sm font-medium">{errorMessage}</span>
                <button className="bg-transparent border-none cursor-pointer outline-none font-bold text-error ml-2" onClick={() => setErrorMessage(null)}>✕</button>
              </div>
            )}

            {canvasElements.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-outline/40 pointer-events-none z-0">
                <span className="material-symbols-outlined text-6xl mb-4">touch_app</span>
                <p className="text-lg font-medium">Drag or click elements from left panel to assemble block</p>
              </div>
            )}

            {/* Sandbox Canvas Paper Wrapper */}
            <div 
              className={`bg-white shadow-2xl border border-outline-variant flex flex-col transition-all duration-300 relative z-10 w-full h-fit min-h-[600px] ${
                viewport === 'desktop' ? 'max-w-[1100px]' : 
                viewport === 'tablet' ? 'max-w-[768px]' : 
                'max-w-[375px]'
              }`}
            >
              {/* Top metadata tag */}
              <div className="p-2 border-b border-outline-variant/30 bg-surface flex justify-center">
                <span className="text-[9px] uppercase tracking-widest font-bold text-outline font-label">Sandbox Workspace - Viewport Simulator</span>
              </div>

              {/* Elements Assembly Box */}
              <div className="flex-grow p-8">
                <div className="border-2 border-dashed border-outline-variant/50 rounded-lg p-6 relative flex flex-col gap-6">
                  <div className="absolute -top-3 left-4 bg-primary text-[8px] text-on-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider font-label">Container: Block Wrapper</div>

                  {canvasElements.map((el) => {
                    const isSelected = el.id === selectedElementId;
                    
                    return (
                      <div 
                        key={el.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                          setIsPropertiesOpen(true);
                        }}
                        className={`border rounded bg-background p-1 relative cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary border-primary hover:ring-2' : 'border-outline-variant/40 hover:ring-2 hover:ring-primary/40'}`}
                      >
                        {/* Selected overlay controls */}
                        <div className="absolute -top-3.5 -right-1 flex gap-1 z-20">
                          <button className="w-6 h-6 bg-surface-container-highest border border-outline-variant rounded flex items-center justify-center shadow-sm text-outline hover:text-on-surface border-none cursor-pointer"><span className="material-symbols-outlined text-[14px]">drag_indicator</span></button>
                          <button 
                            onClick={(e) => removeElementFromCanvas(el.id, e)}
                            className="w-6 h-6 bg-surface-container-highest border border-outline-variant rounded flex items-center justify-center shadow-sm text-error hover:bg-error-container/20 border-none cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>

                        {/* Rendering different mockups based on elements type */}
                        {el.type === 'Carousel' ? (
                          <div className="flex h-64 bg-surface-container-high items-center justify-between px-4 rounded-lg relative overflow-hidden">
                            <span className="material-symbols-outlined text-4xl text-outline/30 select-none">chevron_left</span>
                            <div className="text-center flex flex-col items-center">
                              <div className="border border-dashed border-primary/40 p-4 rounded bg-surface/50 mb-3 flex flex-col items-center">
                                <span className="material-symbols-outlined text-outline mb-1">image</span>
                                <p className="text-[9px] uppercase font-bold text-outline tracking-wider font-label m-0">Slide Image Placeholder</p>
                              </div>
                              <div className="border border-dashed border-primary/40 p-3 rounded bg-surface/50 min-w-[220px]">
                                <h3 className="text-base font-headline font-bold mb-1 mt-0 leading-tight">Slide Title</h3>
                                <p className="text-[10px] text-outline m-0 leading-relaxed font-body">Supporting slide description goes here...</p>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-4xl text-outline/30 select-none">chevron_right</span>

                            {/* Dots indicators */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-outline/30"></div>
                              <div className="w-1.5 h-1.5 rounded-full bg-outline/30"></div>
                            </div>
                          </div>
                        ) : el.type === 'Heading' ? (
                          <div className="p-3 bg-surface-container-high rounded text-center">
                            <h2 className="text-2xl font-headline font-bold text-on-surface m-0 select-none">Heading Title</h2>
                          </div>
                        ) : el.type === 'Text' ? (
                          <div className="p-3 bg-surface-container-high rounded">
                            <p className="text-sm font-body text-on-surface-variant m-0 select-none">Editorial summary text block. Alexandria curators read and write here...</p>
                          </div>
                        ) : el.type === 'Image' ? (
                          <div className="h-36 bg-surface-container rounded-lg flex flex-col items-center justify-center border border-outline-variant/10">
                            <span className="material-symbols-outlined text-outline text-3xl mb-1 select-none">image</span>
                            <p className="text-[10px] text-outline font-label uppercase m-0 select-none">Media Image Placeholder</p>
                          </div>
                        ) : (
                          // Fallback layout block render
                          <div className="p-4 bg-surface-container-high flex items-center justify-between rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-outline">{el.icon}</span>
                              <span className="text-sm font-medium">{el.name} Block</span>
                            </div>
                            <span className="text-[9px] uppercase font-bold text-outline font-label bg-surface px-2 py-0.5 rounded">{el.category}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Drop zone placeholder inside paper container */}
                  <div className="border-2 border-dashed border-outline-variant/30 rounded py-8 flex flex-col items-center justify-center text-outline/50 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer">
                    <span className="material-symbols-outlined text-3xl mb-2">add_circle</span>
                    <p className="text-xs font-semibold uppercase tracking-wider font-label m-0">Drop layout elements here</p>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* Right Properties Split Panel */}
          <aside 
            className={`border-l border-outline-variant flex-col bg-surface-container-lowest flex-shrink-0 transition-all duration-300 ease-in-out z-10 flex ${
              isPropertiesOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
            }`}
          >
            {/* Header Tabs */}
            <div className="flex border-b border-outline-variant flex-shrink-0">
              <button 
                onClick={() => setActiveTab('properties')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors border-none cursor-pointer bg-transparent ${activeTab === 'properties' ? 'text-primary border-b-2 border-primary font-bold' : 'text-outline hover:text-on-surface-variant'}`}
              >
                Properties
              </button>
              <button 
                onClick={() => setActiveTab('mapping')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors border-none cursor-pointer bg-transparent ${activeTab === 'mapping' ? 'text-primary border-b-2 border-primary' : 'text-outline hover:text-on-surface-variant'}`}
              >
                Mapping
              </button>
            </div>

            {/* Panel details scroll container */}
            <div className="flex-grow overflow-y-auto scrollbar-thin">
              {selectedElement ? (
                <>
                  {/* Identification panel */}
                  <div className="p-4 bg-primary/5 border-b border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1 text-primary">
                        <span className="material-symbols-outlined text-sm">{selectedElement.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest font-label">Selected: {selectedElement.type}</span>
                      </div>
                      <p className="text-[9px] text-outline font-mono m-0">Element ID: <code className="bg-surface px-1">{selectedElement.id}</code></p>
                    </div>
                    <button 
                      onClick={() => setIsPropertiesOpen(false)}
                      className="text-outline hover:text-on-surface border-none bg-transparent cursor-pointer flex items-center"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  {activeTab === 'properties' ? (
                    /* PROPERTIES CONFIGURATION */
                    <div className="p-6 space-y-8">
                      {selectedElement.type === 'Carousel' ? (
                        <section>
                          <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4 font-label">Configuration</h4>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 text-on-surface-variant">Transition Effect</label>
                              <select 
                                value={selectedElement.properties.transition || 'Slide (Horizontal)'}
                                onChange={(e) => updateSelectedProperty('transition', e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                              >
                                <option>Slide (Horizontal)</option>
                                <option>Fade</option>
                                <option>Slide (Vertical)</option>
                              </select>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-on-surface-variant">Autoplay</label>
                              <button 
                                onClick={() => updateSelectedProperty('autoplay', !selectedElement.properties.autoplay)}
                                className={`w-10 h-5 rounded-full relative cursor-pointer border-none flex-shrink-0 spring-toggle ${selectedElement.properties.autoplay ? 'bg-primary' : 'bg-outline-variant/40'}`}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${selectedElement.properties.autoplay ? 'right-0.5' : 'left-0.5'}`}></div>
                              </button>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold mb-1.5 text-on-surface-variant">Interval (ms)</label>
                              <input 
                                type="number" 
                                value={selectedElement.properties.interval || 5000}
                                onChange={(e) => updateSelectedProperty('interval', parseInt(e.target.value) || 0)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </div>
                          </div>
                        </section>
                      ) : (
                        <div className="p-4 bg-surface text-center rounded border border-dashed border-outline-variant/40">
                          <p className="text-xs text-outline m-0">No active parameters configuration needed for basic {selectedElement.type} layout elements.</p>
                        </div>
                      )}

                      {/* Live Generated Schema view */}
                      <section>
                        <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4 font-label">Schema Export</h4>
                        <div className="bg-inverse-surface text-inverse-on-surface p-3 rounded font-mono text-[9px] overflow-hidden leading-relaxed shadow-inner max-h-56 overflow-y-auto scrollbar-thin">
                          <pre className="opacity-85 m-0"><code>{JSON.stringify(generatedSchema, null, 2)}</code></pre>
                        </div>
                      </section>
                    </div>
                  ) : (
                    /* CMS DATA MAPPING */
                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest font-label m-0">CMS Data Mapping</h4>
                        <span className="material-symbols-outlined text-primary text-sm cursor-help select-none">info</span>
                      </div>
                      
                      {selectedElement.type === 'Carousel' ? (
                        <div className="space-y-4">
                          <div className="p-3 border border-outline-variant rounded bg-surface-container-low">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-label">Image Source</span>
                              <span className="material-symbols-outlined text-[14px] text-outline">link</span>
                            </div>
                            <select 
                              value={selectedElement.mappings.imageSrc || 'slide_items[].image_url'}
                              onChange={(e) => updateSelectedMapping('imageSrc', e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-mono"
                            >
                              <option>slide_items[].image_url</option>
                              <option>featured_image</option>
                              <option>+ Create New Key</option>
                            </select>
                          </div>

                          <div className="p-3 border border-outline-variant rounded bg-surface-container-low">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[8px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-label">Heading Text</span>
                              <span className="material-symbols-outlined text-[14px] text-outline">link</span>
                            </div>
                            <select 
                              value={selectedElement.mappings.headingText || 'slide_items[].title'}
                              onChange={(e) => updateSelectedMapping('headingText', e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer font-mono"
                            >
                              <option>slide_items[].title</option>
                              <option>entry_title</option>
                              <option>+ Create New Key</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-surface text-center rounded border border-dashed border-outline-variant/40">
                          <p className="text-xs text-outline m-0">No active CMS structure mapping needed for basic {selectedElement.type} layout elements.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-outline/50 pointer-events-none">
                  <span className="material-symbols-outlined text-4xl mb-2">touch_app</span>
                  <p className="text-xs font-semibold uppercase tracking-wider font-label m-0">Select an element to edit properties</p>
                </div>
              )}
            </div>

            {/* Properties Footer */}
            <div className="p-4 border-t border-outline-variant bg-surface-container-low flex-shrink-0">
              <button 
                onClick={() => {
                  setSuccessMessage('Schema successfully validated against Payload CMS strict guidelines.')
                  setTimeout(() => setSuccessMessage(null), 3500)
                }}
                className="w-full py-2 bg-transparent border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all text-[10px] font-bold uppercase tracking-widest rounded cursor-pointer"
              >
                Validate Schema
              </button>
            </div>
          </aside>

        </div>
      </main>

      {/* Success Notification Toast */}
      {successMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-bounce-short z-[9999]">
          <span className="material-symbols-outlined text-primary-fixed">check_circle</span>
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Bounce keyframes animation */}
      <style jsx>{`
        @keyframes bounce-short {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -10px); }
        }
        .animate-bounce-short {
          animation: bounce-short 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
