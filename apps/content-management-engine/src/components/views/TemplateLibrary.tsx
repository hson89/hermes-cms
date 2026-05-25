'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Icon } from '../ui/atoms/Icon'

interface Template {
  id: string
  name: string
  category: string
  tags: string[]
  description: string
  image: string
  status: 'Live' | 'Draft'
  updatedAt: string
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop'

export const TemplateLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/page-templates?depth=1&limit=100')
        if (!response.ok) throw new Error('Failed to fetch templates')
        
        const data = await response.json()
        
        const mappedTemplates: Template[] = data.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          category: doc.contentType?.name || 'Uncategorized',
          tags: doc.tenant?.name ? [doc.tenant.name] : [],
          description: doc.description || 'No description provided for this structural blueprint.',
          image: doc.image?.url || PLACEHOLDER_IMAGE,
          status: doc.status === 'published' ? 'Live' : 'Draft',
          updatedAt: new Date(doc.updatedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        }))
        
        setTemplates(mappedTemplates)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [templates, searchQuery])

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
        <div className="flex items-center gap-3 bg-surface-container-lowest p-1.5 rounded-xl border border-surface-dim/20">
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
          <button className="p-2 text-secondary hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer">
            <Icon name="filter_list" />
          </button>
        </div>
      </header>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
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
          <button 
            onClick={() => window.location.href = '/admin/collections/page-templates/create'}
            className="flex items-center gap-2 px-8 py-3.5 bg-primary text-on-primary rounded-xl font-label font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 border-none cursor-pointer"
          >
            <Icon name="add" size={20} />
            Create First Blueprint
          </button>
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredTemplates.map((template) => (
            <article 
              key={template.id}
              className="group bg-surface-container-lowest rounded-[1rem] overflow-hidden flex flex-col transition-all duration-300 hover:bg-surface-container-low cursor-pointer border border-surface-dim/10 hover:border-surface-dim/30"
              onClick={() => window.location.href = `/admin/templates/builder/${template.id}`}
            >
              <div className="relative h-56 w-full overflow-hidden bg-surface-container-highest">
                <img 
                  src={template.image} 
                  alt={template.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-in-out mix-blend-multiply opacity-90"
                />
                <div className={`absolute top-4 right-4 ${template.status === 'Live' ? 'bg-tertiary-container/90' : 'bg-surface-variant/90'} backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${template.status === 'Live' ? 'bg-tertiary' : 'bg-outline'}`}></span>
                  <span className={`font-label text-xs font-semibold ${template.status === 'Live' ? 'text-on-tertiary-container' : 'text-on-surface-variant'} tracking-wide`}>
                    {template.status}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-surface-container rounded-md font-label text-xs font-semibold text-secondary uppercase tracking-widest">
                    {template.category}
                  </span>
                  {template.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-primary-fixed/50 rounded-md font-label text-xs font-semibold text-on-primary-fixed uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <h3 className="font-headline text-2xl font-bold text-on-surface mb-2 leading-tight">{template.name}</h3>
                <p className="font-body text-sm text-on-surface-variant flex-1 mb-6 leading-relaxed line-clamp-3">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 relative">
                  <div className="absolute top-0 left-0 right-0 h-px bg-surface-dim/30"></div>
                  <span className="font-body text-xs text-outline flex items-center gap-1">
                    <Icon name="update" size={16} />
                    Updated {template.updatedAt}
                  </span>
                  <button className="text-primary font-label text-sm font-semibold group-hover:underline underline-offset-4 decoration-primary/30 flex items-center gap-1 border-none bg-transparent cursor-pointer">
                    Edit Schema
                    <Icon name="arrow_forward" size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-surface-container-low rounded-3xl border border-dashed border-outline/20">
          <Icon name="search_off" className="text-outline mb-4" size={48} />
          <p className="font-body text-xl text-on-surface-variant">No blueprints found matching "{searchQuery}"</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-6 text-primary font-label font-bold hover:underline cursor-pointer border-none bg-transparent"
          >
            Clear search filters
          </button>
        </div>
      )}
    </div>
  )
}
