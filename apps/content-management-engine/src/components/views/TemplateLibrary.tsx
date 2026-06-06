"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/atoms/Icon'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'
import { BRANDING } from '@/constants/branding'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { FilterChips, FilterOption } from '@/components/ui/molecules/FilterChips'
import { RegistryPagination } from '@/components/ui/molecules/RegistryPagination'
import { ConfirmationModal } from '@/components/ui/organisms/ConfirmationModal'
import { Badge } from '@/components/ui/atoms/Badge'

interface Template {
  id: string
  name: string
  category: string
  tags: string[]
  description: string
  image: string
  status: 'Live' | 'Draft' | 'Archived'
  updatedAt: string
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop'

export const TemplateLibrary: React.FC = () => {
  const router = useRouter()

  // API List States
  const [templates, setTemplates] = useState<Template[]>([])
  const [contentTypes, setContentTypes] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all')

  // Pagination States
  const [page, setPage] = useState(1)
  const [limit] = useState(6) // 6 is ideal for 3-column responsive card grids
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  // Interactive UI States
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewTemplateName, setPreviewTemplateName] = useState<string>('')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  const handleStatusFilterChange = (status: 'all' | 'active' | 'draft' | 'archived') => {
    setStatusFilter(status)
    setPage(1)
  }

  const handleContentTypeFilterChange = (val: string) => {
    setContentTypeFilter(val)
    setPage(1)
  }

  // Fetch available content types for filtering
  useEffect(() => {
    const fetchContentTypes = async () => {
      try {
        const response = await fetch('/api/content-types?limit=100')
        if (response.ok) {
          const data = await response.json()
          setContentTypes(data.docs.map((doc: any) => ({ id: doc.id, name: doc.name })))
        }
      } catch (err) {
        console.error('Failed to fetch content types', err)
      }
    }
    fetchContentTypes()
  }, [])

  // Fetch templates logic
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      let url = `/api/page-templates?depth=1&limit=${limit}&page=${page}&sort=-createdAt`
      const query: any = {}
      
      if (debouncedSearch.trim()) {
        query.name = { contains: debouncedSearch.trim() }
      }
      
      if (statusFilter !== 'all') {
        query.status = { equals: statusFilter }
      }
      
      if (contentTypeFilter !== 'all') {
        query.contentType = { equals: contentTypeFilter }
      }

      const filterParts: string[] = []
      Object.entries(query).forEach(([key, value]: [string, any]) => {
        Object.entries(value).forEach(([op, val]) => {
          filterParts.push(`where[${key}][${op}]=${encodeURIComponent(val as string)}`)
        })
      })

      if (filterParts.length > 0) {
        url += `&${filterParts.join('&')}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to retrieve template library.')
      
      const data = await response.json()
      
      const mappedTemplates: Template[] = data.docs.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        category: doc.contentType?.name || 'Uncategorized',
        tags: doc.tags?.map((t: any) => t.tag) || [],
        description: doc.description || 'No description provided for this blueprint template.',
        image: doc.image?.url || PLACEHOLDER_IMAGE,
        status: doc.status === 'active' ? 'Live' : doc.status === 'archived' ? 'Archived' : 'Draft',
        updatedAt: new Date(doc.updatedAt).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      }))
      
      setTemplates(mappedTemplates)
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (err: any) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, statusFilter, contentTypeFilter, limit])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Action Menu Helpers
  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenu(activeMenu === id ? null : id)
  }

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewTemplateId(null)
        setPreviewHtml(null)
        setActiveMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleAction = (e: React.MouseEvent, action: string, templateId: string) => {
    e.stopPropagation()
    setActiveMenu(null)
    if (action === 'delete') {
      setTemplateToDelete(templateId)
      setIsDeleteModalOpen(true)
    }
    if (action === 'preview') {
      const template = templates.find(t => t.id === templateId)
      setPreviewTemplateId(templateId)
      setPreviewTemplateName(template?.name || 'Template Blueprint')
      setIsPreviewLoading(true)
      setPreviewHtml(null)
      
      fetch(`/api/page-templates/${templateId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load template content')
          return res.json()
        })
        .then(data => {
          setPreviewHtml(data.htmlContent || '<h1>No content found inside this blueprint</h1>')
        })
        .catch(err => {
          console.error(err)
          setPreviewHtml(`<h1>Error loading template</h1><p>${err.message}</p>`)
        })
        .finally(() => {
          setIsPreviewLoading(false)
        })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return
    setIsDeleteModalOpen(false)
    try {
      const response = await fetch(`/api/page-templates/${templateToDelete}`, { method: 'DELETE' })
      if (response.ok) {
        if (templates.length === 1 && page > 1) {
          setPage(page - 1)
        } else {
          fetchTemplates()
        }
      }
    } catch (err) {
      console.error('Failed to delete template:', err)
    } finally {
      setTemplateToDelete(null)
    }
  }

  const filterOptions: FilterOption<'all' | 'active' | 'draft' | 'archived'>[] = [
    { value: 'all', label: 'All Blueprints' },
    { value: 'active', label: 'Live' },
    { value: 'draft', label: 'Drafts' },
    { value: 'archived', label: 'Archived' },
  ]

  const emptyState = (
    <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/15 flex flex-col items-center justify-center">
      <div className="size-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 text-outline-variant">
        <Icon name="auto_stories" size={32} />
      </div>
      <h3 className="font-headline font-bold text-lg text-on-surface">No Templates Registered</h3>
      <p className="text-xs text-outline mt-1.5 max-w-sm mx-auto leading-relaxed">
        {debouncedSearch || statusFilter !== 'all' || contentTypeFilter !== 'all'
          ? 'No structural blueprints fit the active filters or search parameters. Refine your query.'
          : 'Start building templates to define consistent editorial layout properties.'}
      </p>
      {(debouncedSearch || statusFilter !== 'all' || contentTypeFilter !== 'all') && (
        <button
          type="button"
          onClick={() => { setSearchQuery(''); setStatusFilter('all'); setContentTypeFilter('all') }}
          className="mt-4 border border-outline-variant/15 text-primary hover:bg-surface-container-low px-4 py-2 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
        >
          Clear All Filters
        </button>
      )}
    </div>
  )

  if (error) {
    return (
      <div className="custom-template-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background flex flex-col items-center justify-center">
        <Icon name="error" className="text-error mb-4" size={48} />
        <h2 className="font-headline text-2xl font-bold text-on-surface">Failed to load library</h2>
        <p className="font-body text-on-surface-variant mt-2">{error}</p>
        <button 
          onClick={() => fetchTemplates()}
          className="mt-6 px-6 py-2 bg-primary text-on-primary rounded-lg font-label font-semibold border-none cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="custom-template-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      {/* Reusable Editorial Header */}
      <RegistryHeader
        title="Template Library"
        subtitle="A curated collection of structural blueprints for digital publication. Select an existing schema or formulate a new architecture to maintain editorial consistency across properties."
        breadcrumbs={[BRANDING.appName, 'Template Library']}
        showAction={true}
        actionText="Create Template"
        actionIcon="add"
        onActionClick={() => router.push('/admin/collections/page-templates/create')}
      />

      {/* Control Bar: Filter Chips, Content Type Dropdown & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mt-8 gap-4">
        <FilterChips
          options={filterOptions}
          selectedValue={statusFilter}
          onChange={handleStatusFilterChange}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={contentTypeFilter}
            onChange={(e) => handleContentTypeFilterChange(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl px-4 py-3 font-label text-xs font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
          >
            <option value="all">All Content Types</option>
            {contentTypes.map(ct => (
              <option key={ct.id} value={ct.id}>{ct.name}</option>
            ))}
          </select>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search blueprints..."
          />
        </div>
      </div>

      {/* Tonal Card Grid Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 mt-6">
          {Array.from({ length: limit }).map((_, idx) => (
            <div key={idx} className="h-64 bg-surface-container-low rounded-2xl animate-pulse ghost-border" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-6">
          {emptyState}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 mt-6">
          {templates.map((template) => {
            const isLive = template.status === 'Live'
            const isArchived = template.status === 'Archived'

            return (
              <div
                key={template.id}
                onClick={() => router.push(`/admin/templates/builder/${template.id}`)}
                className="group bg-surface-container-lowest/70 hover:bg-surface-container-lowest rounded-2xl p-0 ghost-border hover-lift flex flex-col relative transition-all duration-300 cursor-pointer"
              >
                {/* Thumbnail Image Container */}
                <div className="h-44 w-full bg-surface-container flex items-center justify-center border-b border-outline-variant/10 rounded-t-2xl overflow-hidden relative">
                  <img
                    src={template.image}
                    alt={template.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-in-out mix-blend-multiply opacity-90"
                  />

                  {/* Status Badge absolute offset */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      color={isLive ? 'success' : isArchived ? 'danger' : 'neutral'}
                      size="sm"
                    >
                      {template.status}
                    </Badge>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-primary/5 rounded-md font-label text-[10px] font-bold text-primary uppercase tracking-widest">
                      {template.category}
                    </span>
                    {template.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} color="neutral" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 2 && (
                      <span className="font-label text-[10px] text-outline font-bold">+{template.tags.length - 2}</span>
                    )}
                  </div>

                  <h3 className="font-headline font-bold text-lg text-on-surface mb-2 leading-tight group-hover:text-primary transition-colors line-clamp-1">
                    {template.name}
                  </h3>
                  
                  <p className="font-body text-xs text-on-surface-variant flex-1 mb-4 leading-relaxed line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/10 relative">
                    <span className="font-body text-[10px] text-outline flex items-center gap-1 font-medium">
                      <Icon name="update" size={14} />
                      Updated {template.updatedAt}
                    </span>

                    <div className="flex items-center gap-1.5 font-label">
                      <button
                        type="button"
                        onClick={(e) => handleAction(e, 'preview', template.id)}
                        title="Preview Layout"
                        className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-primary transition-all border-none bg-transparent cursor-pointer relative"
                      >
                        <Icon name="visibility" size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => toggleMenu(template.id, e)}
                        title="More Options"
                        className="size-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline-variant hover:text-on-surface transition-all border-none bg-transparent cursor-pointer relative"
                      >
                        <Icon name="more_vert" size={18} />
                      </button>

                      {/* Actions Dropdown */}
                      {activeMenu === template.id && (
                        <div 
                          className="absolute right-0 bottom-10 bg-surface/90 backdrop-blur-md border border-outline-variant/15 rounded-xl modal-shadow w-48 py-1.5 z-40 animate-fade-slide-up text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/templates/builder/${template.id}`)}
                            className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <Icon name="edit" size={14} />
                            Edit Schema
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleAction(e, 'preview', template.id)}
                            className="w-full text-left font-label text-xs font-semibold px-4 py-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <Icon name="visibility" size={14} />
                            Preview Layout
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleAction(e, 'delete', template.id)}
                            className="w-full text-left font-label text-xs font-bold px-4 py-2.5 text-error hover:bg-error/10 transition-colors flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <Icon name="delete" size={14} className="text-error" />
                            Delete Blueprint
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reusable Pagination */}
      <RegistryPagination
        page={page}
        limit={limit}
        totalPages={totalPages}
        totalDocs={totalDocs}
        onPageChange={setPage}
        loading={isLoading}
      />

      {/* Premium Glassmorphic Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Blueprint"
        content={<p className="m-0 leading-relaxed font-body">Are you sure you want to delete this structural blueprint? This action is permanent and cannot be undone.</p>}
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setIsDeleteModalOpen(false); setTemplateToDelete(null) }}
        type="danger"
      />

      {/* Immersive Cinematic Preview Overlay Modal */}
      {previewTemplateId && (
        <div className="fixed inset-y-0 right-0 left-0 lg:left-[18rem] z-50 bg-neutral-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 md:p-10 animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-dim/20 w-full h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] max-w-7xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <header className="bg-surface-container-low px-6 py-4 flex justify-between items-center border-b border-surface-dim/20">
              <div className="flex items-center gap-3">
                <Icon name="auto_awesome" className="text-primary" />
                <h3 className="font-headline text-lg font-bold text-on-surface tracking-tight">
                  <span className="font-['Noto_Serif'] italic font-medium pr-1">"{previewTemplateName}"</span> — Immersive Preview
                </h3>
              </div>

              {/* Viewport Width Control Toggles */}
              <div className="hidden sm:flex items-center bg-surface-container rounded-xl p-1 border border-surface-dim/15">
                <button
                  onClick={() => setViewport('desktop')}
                  className={`px-4 py-2 rounded-lg font-label text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${viewport === 'desktop' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high bg-transparent'}`}
                >
                  <Icon name="desktop_windows" size={18} /> Desktop
                </button>
                <button
                  onClick={() => setViewport('tablet')}
                  className={`px-4 py-2 rounded-lg font-label text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${viewport === 'tablet' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high bg-transparent'}`}
                >
                  <Icon name="tablet_mac" size={18} /> Tablet
                </button>
                <button
                  onClick={() => setViewport('mobile')}
                  className={`px-4 py-2 rounded-lg font-label text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${viewport === 'mobile' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high bg-transparent'}`}
                >
                  <Icon name="smartphone" size={18} /> Mobile
                </button>
              </div>

              {/* Exit Controller */}
              <button
                onClick={() => {
                  setPreviewTemplateId(null)
                  setPreviewHtml(null)
                }}
                className="flex items-center gap-2 bg-error/10 hover:bg-error/20 text-error px-4 py-2 font-label text-xs font-bold rounded-xl border border-error/20 transition-all duration-300 cursor-pointer"
              >
                <Icon name="arrow_back" size={16} /> Exit Preview
              </button>
            </header>

            {/* Viewport Canvas container */}
            <div className="flex-1 bg-surface p-6 flex justify-center items-center overflow-hidden relative">
              {/* Floating Close Button - Always visible on UI */}
              <button
                onClick={() => {
                  setPreviewTemplateId(null)
                  setPreviewHtml(null)
                }}
                className="absolute bottom-10 right-10 z-50 flex items-center gap-2 bg-neutral-900/90 text-white hover:bg-error hover:text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 transition-all duration-300 cursor-pointer font-label text-xs font-bold uppercase tracking-wider"
              >
                <Icon name="close" size={16} /> Close Preview
              </button>
              
              {isPreviewLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  <span className="font-label text-xs font-bold text-outline uppercase tracking-widest animate-pulse">
                    Synthesizing cinematic preview layout...
                  </span>
                </div>
              ) : previewHtml ? (
                <div 
                  className={`h-full shadow-2xl transition-all duration-300 ${
                    viewport === 'desktop' ? 'w-full rounded-2xl' :
                    viewport === 'tablet' ? 'w-[768px] rounded-2xl' :
                    'w-[375px] rounded-2xl'
                  } bg-surface-container-lowest border border-surface-dim/20 overflow-hidden flex flex-col`}
                >
                  {/* Mock Browser Titlebar */}
                  <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-surface-dim/20 select-none">
                    {/* Window Controls */}
                    <div className="flex items-center gap-1.5 w-24">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                      <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                      <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>

                    {/* Mock URL Bar */}
                    <div className="flex-1 max-w-xl bg-surface-container-lowest border border-surface-dim/15 px-4 py-1.5 rounded-lg text-xs font-mono text-outline flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-2 truncate">
                        <Icon name="lock" size={12} className="text-secondary" />
                        <span className="truncate">hermes-cms.local/preview/{previewTemplateName.toLowerCase().replace(/\s+/g, '-')}</span>
                      </div>
                      <Icon name="refresh" size={14} className="text-outline/60 cursor-pointer hover:text-primary transition-colors" />
                    </div>

                    {/* Preview Indicator Badge */}
                    <div className="w-24 flex justify-end">
                      <span className="bg-primary/10 border border-primary/20 text-primary font-label text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Preview
                      </span>
                    </div>
                  </div>

                  {/* Active Sandboxed Iframe */}
                  <div className="flex-1 bg-white relative">
                    <iframe 
                      srcDoc={previewHtml}
                      title="Template Live Preview"
                      className="w-full h-full border-none bg-white"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <Icon name="error" className="text-error mb-4" size={48} />
                  <h4 className="font-headline text-lg font-bold text-on-surface">Compilation Error</h4>
                  <p className="font-body text-sm text-on-surface-variant max-w-md mt-2">
                    Could not resolve visual structure inside this blueprint template.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
