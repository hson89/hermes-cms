'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '../ui/atoms/Icon'
import { ConfirmationModal } from '../ui/organisms/ConfirmationModal'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all')
  const [contentTypes, setContentTypes] = useState<{ id: string, name: string }[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

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

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        if (page === 1) setIsLoading(true)
        else setIsFiltering(true)

        let url = `/api/page-templates?depth=1&limit=12&page=${page}`
        
        const query: any = {}
        
        if (debouncedSearch) {
          query.name = { contains: debouncedSearch }
        }
        
        if (statusFilter !== 'all') {
          query.status = { equals: statusFilter }
        }
        
        if (contentTypeFilter !== 'all') {
          query.contentType = { equals: contentTypeFilter }
        }

        // Build where clause
        const whereClauses: string[] = []
        Object.entries(query).forEach(([key, value]: [string, any]) => {
          Object.entries(value).forEach(([op, val]) => {
            whereClauses.push(`where[${key}][${op}]=${encodeURIComponent(val as string)}`)
          })
        })

        if (whereClauses.length > 0) {
          url += `&${whereClauses.join('&')}`
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch templates')
        
        const data = await response.json()
        
        const mappedTemplates: Template[] = data.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          category: doc.contentType?.name || 'Uncategorized',
          tags: doc.tags?.map((t: any) => t.tag) || [],
          description: doc.description || 'No description provided for this structural blueprint.',
          image: doc.image?.url || PLACEHOLDER_IMAGE,
          status: doc.status === 'active' ? 'Live' : doc.status === 'archived' ? 'Archived' : 'Draft',
          updatedAt: new Date(doc.updatedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        }))
        
        if (page === 1) {
          setTemplates(mappedTemplates)
        } else {
          setTemplates(prev => [...prev, ...mappedTemplates])
        }
        
        setHasNextPage(data.hasNextPage)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setIsLoading(false)
        setIsFiltering(false)
      }
    }

    fetchTemplates()
  }, [debouncedSearch, statusFilter, contentTypeFilter, page])

  const handleFilterChange = (type: string, value: string) => {
    if (type === 'status') setStatusFilter(value)
    if (type === 'contentType') setContentTypeFilter(value)
    setPage(1)
  }

  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const handleAction = (e: React.MouseEvent, action: string, templateId: string) => {
    e.stopPropagation()
    setActiveMenu(null)
    console.log(`Action: ${action} for template: ${templateId}`)
    if (action === 'delete') {
      setTemplateToDelete(templateId)
      setIsDeleteModalOpen(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return
    setIsDeleteModalOpen(false)
    try {
      const response = await fetch(`/api/page-templates/${templateToDelete}`, { method: 'DELETE' })
      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete))
      }
    } catch (err) {
      console.error('Failed to delete template:', err)
    } finally {
      setTemplateToDelete(null)
    }
  }

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  if (error) {
    return (
      <div className="custom-editor-view min-h-screen bg-surface-bright p-10 flex flex-col items-center justify-center">
        <Icon name="error" className="text-error mb-4" size={48} />
        <h2 className="font-headline text-2xl font-bold text-on-surface">Failed to load library</h2>
        <p className="font-body text-on-surface-variant mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-primary text-on-primary rounded-lg font-label font-semibold"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="custom-editor-view no-header min-h-screen bg-surface-bright p-10 lg:p-16">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-primary mb-3">
            <span className="font-label text-sm font-semibold tracking-wide uppercase">Curation Subsystem</span>
            <Icon name="chevron_right" size={16} />
            <span className="font-label text-sm text-secondary">Library</span>
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tight leading-tight">Template Library</h2>
          <p className="font-body text-lg text-on-surface-variant mt-4 leading-relaxed">
            A curated collection of structural blueprints for digital publication. Select an existing schema or formulate a new architecture to maintain editorial consistency across properties.
          </p>
        </div>
        
        {/* Contextual Actions */}
        <div className="flex items-center gap-3 bg-surface-container-lowest p-1.5 rounded-xl border border-surface-dim/20 relative">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
            <input 
              type="text"
              placeholder="Search blueprints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-surface-container-lowest text-on-surface font-body text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 placeholder:text-outline/70 transition-all border-none"
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center border-none cursor-pointer ${isFilterOpen ? 'bg-primary text-on-primary' : 'text-secondary hover:text-primary hover:bg-surface-container-low bg-transparent'}`}
          >
            <Icon name="filter_list" />
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-dim/20 z-50 p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="font-label text-xs font-bold text-outline uppercase tracking-widest mb-3 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'active', 'draft', 'archived'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleFilterChange('status', s)}
                      className={`px-3 py-1.5 rounded-lg font-label text-xs font-semibold transition-all border-none cursor-pointer ${statusFilter === s ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-label text-xs font-bold text-outline uppercase tracking-widest mb-3 block">Content Type</label>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  <button
                    onClick={() => handleFilterChange('contentType', 'all')}
                    className={`text-left px-3 py-2 rounded-lg font-body text-sm transition-all border-none cursor-pointer ${contentTypeFilter === 'all' ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high bg-transparent'}`}
                  >
                    All Types
                  </button>
                  {contentTypes.map(ct => (
                    <button
                      key={ct.id}
                      onClick={() => handleFilterChange('contentType', ct.id)}
                      className={`text-left px-3 py-2 rounded-lg font-body text-sm transition-all border-none cursor-pointer ${contentTypeFilter === ct.id ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-high bg-transparent'}`}
                    >
                      {ct.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  setStatusFilter('all')
                  setContentTypeFilter('all')
                  setPage(1)
                  setIsFilterOpen(false)
                }}
                className="w-full py-2 font-label text-xs text-primary font-bold hover:bg-primary/5 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content Grid */}
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[400px] bg-surface-container-low rounded-[1rem] animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-surface-container-lowest rounded-3xl border border-dashed border-surface-dim/30 max-w-4xl mx-auto text-center px-6">
          <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mb-8">
            <Icon name="auto_stories" className="text-primary" size={40} />
          </div>
          <h3 className="font-headline text-3xl font-bold text-on-surface mb-4">Initialize Your Library</h3>
          <p className="font-body text-on-surface-variant max-w-lg mb-10 leading-relaxed">
            Your architectural library is currently empty. Define your first structural blueprint to establish editorial standards and streamline the publication process across your properties.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {templates.map((template) => (
              <article 
                key={template.id}
                className="group bg-surface-container-lowest rounded-[1rem] overflow-hidden flex flex-col transition-all duration-300 hover:bg-surface-container-low cursor-pointer border border-surface-dim/10 hover:border-surface-dim/30 shadow-sm hover:shadow-xl hover:shadow-primary/5"
                onClick={() => router.push(`/admin/templates/builder/${template.id}`)}
              >
                <div className="relative h-56 w-full overflow-hidden bg-surface-container-highest">
                  <img 
                    src={template.image} 
                    alt={template.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-in-out mix-blend-multiply opacity-90"
                  />
                  
                  {/* Actions Menu Trigger */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenu(activeMenu === template.id ? null : template.id)
                    }}
                    className="absolute top-4 left-4 p-2 bg-surface-container-lowest/80 backdrop-blur-sm rounded-lg text-on-surface hover:bg-surface-container-lowest transition-all border-none cursor-pointer z-10 shadow-sm"
                  >
                    <Icon name="more_vert" size={20} />
                  </button>

                  {activeMenu === template.id && (
                    <div className="absolute top-14 left-4 w-40 bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-dim/20 z-20 py-2 animate-in fade-in slide-in-from-top-1">
                      <button onClick={(e) => handleAction(e, 'preview', template.id)} className="w-full text-left px-4 py-2 text-sm font-label font-bold text-on-surface-variant hover:bg-surface-container-high border-none bg-transparent cursor-pointer flex items-center gap-2">
                        <Icon name="visibility" size={18} /> Preview
                      </button>
                      <button onClick={(e) => handleAction(e, 'duplicate', template.id)} className="w-full text-left px-4 py-2 text-sm font-label font-bold text-on-surface-variant hover:bg-surface-container-high border-none bg-transparent cursor-pointer flex items-center gap-2">
                        <Icon name="content_copy" size={18} /> Duplicate
                      </button>
                      <div className="h-px bg-surface-dim/20 my-1 mx-2"></div>
                      <button onClick={(e) => handleAction(e, 'delete', template.id)} className="w-full text-left px-4 py-2 text-sm font-label font-bold text-error hover:bg-error/5 border-none bg-transparent cursor-pointer flex items-center gap-2">
                        <Icon name="delete" size={18} /> Delete
                      </button>
                    </div>
                  )}

                  <div className={`absolute top-4 right-4 ${
                    template.status === 'Live' ? 'bg-tertiary-container/90' : 
                    template.status === 'Archived' ? 'bg-error-container/90' : 
                    'bg-surface-variant/90'
                  } backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm`}>
                    <span className={`w-2 h-2 rounded-full ${
                      template.status === 'Live' ? 'bg-tertiary' : 
                      template.status === 'Archived' ? 'bg-error' : 
                      'bg-outline'
                    }`}></span>
                    <span className={`font-label text-xs font-semibold ${
                      template.status === 'Live' ? 'text-on-tertiary-container' : 
                      template.status === 'Archived' ? 'text-on-error-container' : 
                      'text-on-surface-variant'
                    } tracking-wide`}>
                      {template.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-surface-container rounded-md font-label text-[10px] font-bold text-secondary uppercase tracking-widest">
                      {template.category}
                    </span>
                    {template.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-primary-fixed/30 rounded-md font-label text-[10px] font-bold text-on-primary-fixed uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 2 && (
                      <span className="font-label text-[10px] text-outline font-bold">+{template.tags.length - 2}</span>
                    )}
                  </div>
                  
                  <h3 className="font-headline text-2xl font-bold text-on-surface mb-2 leading-tight group-hover:text-primary transition-colors">{template.name}</h3>
                  <p className="font-body text-sm text-on-surface-variant flex-1 mb-6 leading-relaxed line-clamp-3">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-surface-dim/30"></div>
                    <span className="font-body text-[10px] text-outline flex items-center gap-1 font-medium">
                      <Icon name="update" size={14} />
                      Updated {template.updatedAt}
                    </span>
                    <button className="text-primary font-label text-sm font-bold group-hover:underline underline-offset-4 decoration-primary/30 flex items-center gap-1 border-none bg-transparent cursor-pointer">
                      Edit Schema
                      <Icon name="arrow_forward" size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-16 flex justify-center">
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={isFiltering}
                className="flex items-center gap-3 px-10 py-4 bg-surface-container-high text-on-surface font-label font-bold rounded-2xl hover:bg-surface-container-highest transition-all border border-surface-dim/20 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isFiltering ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Icon name="expand_more" />
                )}
                Load More Blueprints
              </button>
            </div>
          )}
        </>
      )}

      {templates.length > 0 && templates.filter(t => t.name.toLowerCase().includes(debouncedSearch.toLowerCase())).length === 0 && debouncedSearch && !isLoading && (
        <div className="flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-3xl border border-dashed border-outline/20">
          <Icon name="search_off" className="text-outline mb-4" size={48} />
          <p className="font-body text-xl text-on-surface-variant">No blueprints found matching "{searchQuery}"</p>
          <button 
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setContentTypeFilter('all')
              setPage(1)
            }}
            className="mt-6 text-primary font-label font-bold hover:underline cursor-pointer border-none bg-transparent"
          >
            Clear all filters
          </button>
        </div>
      )}
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
    </div>
  )
}
