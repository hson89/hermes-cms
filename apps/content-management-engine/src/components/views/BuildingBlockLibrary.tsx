'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '../ui/atoms/Icon'
import { useAuth } from '@payloadcms/ui'

interface BuildingBlock {
  id: string
  name: string
  slug: string
  category: 'layout' | 'media' | 'text' | 'interactive'
  status: 'active' | 'deprecated'
  thumbnail?: {
    url: string
  }
  usageCount?: number
  updatedAt: string
}

const CATEGORIES = [
  { label: 'All Categories', value: 'all' },
  { label: 'Layout', value: 'layout' },
  { label: 'Media', value: 'media' },
  { label: 'Text', value: 'text' },
  { label: 'Interactive', value: 'interactive' },
]

export const BuildingBlockLibrary: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [blocks, setBlocks] = useState<BuildingBlock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('Recently Added')

  // Animation state for staggered reveal
  const [revealedIndex, setRevealedIndex] = useState(-1)
  useEffect(() => {
    if (isLoading) return
    const timer = setInterval(() => {
      setRevealedIndex(prev => prev < blocks.length ? prev + 1 : prev)
    }, 100)
    return () => clearInterval(timer)
  }, [isLoading, blocks.length])

  const activeTenantId = useMemo(() => {
    return (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant
  }, [user])

  const isSuperAdmin = useMemo(() => {
    return (user as any)?.role === 'super-admin'
  }, [user])

  useEffect(() => {
    if (!user) return
    if (!isSuperAdmin && !activeTenantId) return

    const fetchBlocks = async () => {
      try {
        setIsLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `JWT ${token}`

        const url = isSuperAdmin
          ? '/api/building-blocks?depth=1&limit=100'
          : `/api/building-blocks?depth=1&limit=100&where[tenant][equals]=${activeTenantId}`

        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error('Failed to fetch building blocks')
        
        const data = await res.json()
        
        const mappedBlocks: BuildingBlock[] = data.docs.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          category: doc.category || 'layout',
          status: doc.status || 'active',
          thumbnail: doc.thumbnail,
          usageCount: 0, 
          updatedAt: doc.updatedAt
        }))

        setBlocks(mappedBlocks)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlocks()
  }, [user, activeTenantId, isSuperAdmin])

  const filteredBlocks = useMemo(() => {
    return blocks.filter(block => {
      const matchesSearch = block.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           block.slug.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = activeCategory === 'all' || block.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [blocks, searchQuery, activeCategory])

  if (error) {
    return (
      <div className="custom-editor-view flex flex-col items-center justify-center min-h-screen bg-surface p-12">
        <Icon name="error" className="text-error mb-4" size={48} />
        <h2 className="font-headline text-2xl font-bold text-on-surface">System Failure</h2>
        <p className="font-body text-on-surface-variant mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div className="custom-editor-view no-header min-h-screen bg-surface-bright flex flex-col relative overflow-hidden">
      {/* Styles Injection for Alexandria Tokens */}
      <style jsx>{`
        .glass-panel {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
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
        .animate-reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-reveal.is-revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth p-8 lg:p-12">
        <div className="max-w-7xl mx-auto w-full">
          
          {/* Header Section */}
          <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-reveal ${revealedIndex >= 0 ? 'is-revealed' : ''}`}>
            <div className="max-w-3xl">
              <h2 className="font-headline text-4xl lg:text-5xl font-bold text-on-surface mb-3 tracking-tight leading-tight m-0">Building Blocks</h2>
              <p className="font-body text-lg text-on-surface-variant max-w-2xl leading-relaxed m-0">
                Manage and construct reusable structural elements. These foundational components form the architectural basis of your editorial templates.
              </p>
            </div>
            <button 
              onClick={() => router.push('/admin/collections/building-blocks/create')}
              className="px-5 py-3 btn-primary-gradient text-white hover:scale-105 active:scale-95 rounded-lg font-label font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 border-none cursor-pointer tracking-wide shrink-0"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create Block
            </button>
          </div>

          {/* Filters and Sorting */}
          <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 pb-6 border-b border-outline-variant/15 animate-reveal ${revealedIndex >= 1 ? 'is-revealed' : ''}`}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-4 py-1.5 rounded-full font-label text-sm font-medium transition-all border-none cursor-pointer ${
                    activeCategory === cat.value 
                    ? 'bg-secondary text-on-secondary' 
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container ghost-border'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-label text-sm text-on-surface-variant">Sort by:</span>
              <select 
                className="bg-surface-container-lowest ghost-border rounded-lg px-3 py-1.5 font-label text-sm focus:ring-primary focus:border-primary border-none cursor-pointer outline-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option>Recently Added</option>
                <option>Most Used</option>
                <option>Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Blocks Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-surface-container-low rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-surface-container-lowest rounded-xl border border-dashed border-surface-dim/30 text-center">
              <Icon name="widgets" className="text-outline/30 mb-4" size={64} />
              <h3 className="font-headline text-2xl font-bold text-on-surface mb-2">No components discovered</h3>
              <p className="font-body text-on-surface-variant max-w-md mx-auto">
                {isSuperAdmin
                  ? 'The global building block registry is currently empty. Synchronize your frontend applications to register new visual components.'
                  : 'Your block registry is currently empty for this tenant. Synchronize your frontend application to register new visual components.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
              {filteredBlocks.map((block, index) => (
                <article 
                  key={block.id}
                  className={`bg-surface-container-lowest rounded-xl p-6 ghost-border hover-lift flex flex-col group cursor-pointer transition-all duration-300 animate-reveal ${revealedIndex >= (index + 2) ? 'is-revealed' : ''}`}
                  onClick={() => router.push(`/admin/collections/building-blocks/${block.id}`)}
                >
                  <div className="h-32 bg-surface-container rounded-lg mb-6 flex items-center justify-center border border-outline-variant/10 overflow-hidden relative">
                    {block.thumbnail ? (
                      <img 
                        src={block.thumbnail.url} 
                        alt={block.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                      />
                    ) : (
                      <div className="w-3/4 h-3/4 flex flex-col gap-2">
                        <div className="w-full h-1/2 bg-surface-dim rounded"></div>
                        <div className="w-2/3 h-1/4 bg-surface-dim rounded"></div>
                      </div>
                    )}
                    {block.status === 'deprecated' && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-error-container/90 backdrop-blur-sm rounded-md flex items-center gap-1 shadow-sm">
                        <span className="w-1 h-1 rounded-full bg-error"></span>
                        <span className="font-label text-[8px] font-bold text-on-error-container uppercase tracking-wider">Deprecated</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-headline font-semibold text-xl text-on-surface group-hover:text-primary transition-colors m-0 leading-tight">
                      {block.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-label font-bold uppercase tracking-wider ${
                      block.category === 'layout' ? 'bg-primary-fixed text-on-primary-fixed-variant' :
                      block.category === 'media' ? 'bg-secondary-fixed text-on-secondary-fixed-variant' :
                      block.category === 'text' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' :
                      'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {block.category}
                    </span>
                  </div>
                  
                  <p className="font-body text-sm text-on-surface-variant mb-6 flex-1 line-clamp-2 leading-relaxed">
                    A foundational <code className="bg-surface-container-high px-1 py-0.5 rounded text-[10px]">{block.slug}</code> architectural element for your editorial layouts.
                  </p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-outline-variant/10 mt-auto">
                    <span className="font-label text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-[14px]">schema</span>
                      Used in {block.usageCount || 0} Templates
                    </span>
                    <button className="font-label text-sm font-semibold text-primary hover:underline flex items-center gap-1 border-none bg-transparent cursor-pointer">
                      Edit Block <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
