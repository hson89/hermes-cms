"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { Icon } from '../../ui/atoms/Icon'
import { TopNavBar } from '../../ui/organisms/TopNavBar'
import { ConfirmationModal } from '../../ui/organisms/ConfirmationModal'
import { DeployTemplateModal } from '../../ui/organisms/DeployTemplateModal'
import { getTenantAndGlobalContentTypesQuery } from '../../../utils/contentTypes'

type Archetype = 'longform' | 'landing' | 'minimal'

interface ContentType {
  id: string
  name: string
  slug: string
}

export const TemplateWorkspaceClient: React.FC<{ serverId?: string }> = ({ serverId }) => {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { id: docId } = useDocumentInfo()
  
  // Handle both standard collection routes (:id) and custom builder routes (:templateId)
  // Payload 3.x uses catch-all segments: ['templates', 'builder', '1']
  const segments = (params as any)?.segments || []
  let parsedId = undefined
  if (segments[0] === 'templates' && segments[1] === 'builder' && segments[2]) {
    parsedId = segments[2]
  } else if (segments[0] === 'collections' && segments[1] === 'page-templates' && segments[2] && segments[2] !== 'create') {
    parsedId = segments[2]
  }

  const effectiveId = (docId && docId !== 'new') ? docId : (serverId || parsedId)
  const isEditing = !!effectiveId && effectiveId !== 'new'

  // Form State
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null)
  const [archetype, setArchetype] = useState<Archetype>('landing')
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('draft')
  const [restrictedAccess, setRestrictedAccess] = useState(false)
  const [locked, setLocked] = useState(false)
  const [isGlobal, setIsGlobal] = useState(false)
  const [htmlContent, setHtmlContent] = useState('')
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [createdBy, setCreatedBy] = useState<string>('Admin')
  
  // UI State
  const [contentTypeSearch, setContentTypeSearch] = useState('')
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoadingContentTypes, setIsLoadingContentTypes] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditing) // Start loading if in edit mode
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [savePulse, setSavePulse] = useState(false)
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [templateTenantId, setTemplateTenantId] = useState<string | number | null>(null)

  const activeTenantId = useMemo(() => {
    return (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant
  }, [user])

  // staggered reveals
  const [revealedIndex, setRevealedIndex] = useState(-1)
  useEffect(() => {
    if (isLoading) return
    const timer = setInterval(() => {
      setRevealedIndex(prev => prev < 10 ? prev + 1 : prev)
    }, 150)
    return () => clearInterval(timer)
  }, [isLoading])

  // Capture token from Payload cookie
  useEffect(() => {
    const tokenMatch = document.cookie.split('; ').find(row => row.startsWith('payload-token='))
    if (tokenMatch) {
      const token = tokenMatch.split('=')[1]
      localStorage.setItem('payload-token', token)
    }
  }, [])

  // Fetch existing template data
  useEffect(() => {
    if (!isEditing || !effectiveId) {
      setIsLoading(false)
      return
    }

    const fetchTemplate = async () => {
      try {
        setIsLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `JWT ${token}`

        const res = await fetch(`/api/page-templates/${effectiveId}?depth=1`, { headers })
        
        if (res.ok) {
          const data = await res.json()
          setTemplateName(data.name || '')
          setTemplateDesc(data.description || '')
          setArchetype(data.archetype || 'landing')
          setStatus(data.status || 'draft')
          setRestrictedAccess(!!data.restrictedAccess)
          setLocked(!!data.locked)
          setIsGlobal(!!data.isGlobal)
          const tenantVal = data.tenant
          setTemplateTenantId(typeof tenantVal === 'object' && tenantVal !== null ? tenantVal.id : tenantVal)
          setHtmlContent(data.htmlContent || '')
          setCreatedAt(data.createdAt ? new Date(data.createdAt).toLocaleDateString() : null)
          setUpdatedAt(data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : null)
          
          if (data.createdBy) {
            if (typeof data.createdBy === 'object' && data.createdBy.name) {
              setCreatedBy(data.createdBy.name)
            } else if (typeof data.createdBy === 'string') {
              setCreatedBy(data.createdBy)
            }
          }

          if (data.contentType) {
            setSelectedContentType(
              typeof data.contentType === 'object' 
                ? { id: data.contentType.id, name: data.contentType.name, slug: data.contentType.slug } 
                : { id: data.contentType, name: 'Loading...', slug: '' }
            )
          }
        } else {
          const errorData = await res.json()
          setError(errorData.errors?.[0]?.message || 'Failed to fetch template data')
        }
      } catch (err) {
        console.error('Failed to fetch template data', err)
        setError('A network error occurred while fetching template data.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplate()
  }, [isEditing, effectiveId])

  // Fetch content types for search
  useEffect(() => {
    if (!activeTenantId) return

    const fetchContentTypes = async () => {
      try {
        setIsLoadingContentTypes(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
        const headers: HeadersInit = {}
        if (token) headers['Authorization'] = `JWT ${token}`

        const res = await fetch(`/api/content-types?${getTenantAndGlobalContentTypesQuery(activeTenantId)}`, { headers })
        if (res.ok) {
          const data = await res.json()
          setContentTypes(data.docs || [])
          
          // If we had a "Loading..." content type, find it in the list now
          if (selectedContentType?.name === 'Loading...') {
            const realCt = data.docs.find((ct: any) => ct.id === selectedContentType.id)
            if (realCt) setSelectedContentType(realCt)
          }
        }
      } catch (err) {
        console.error('Failed to fetch content types', err)
      } finally {
        setIsLoadingContentTypes(false)
      }
    }

    fetchContentTypes()
  }, [activeTenantId, selectedContentType?.id, selectedContentType?.name])

  const filteredContentTypes = useMemo(() => {
    if (!contentTypeSearch) return contentTypes
    return contentTypes.filter(ct => 
      ct.name.toLowerCase().includes(contentTypeSearch.toLowerCase()) || 
      ct.slug.toLowerCase().includes(contentTypeSearch.toLowerCase())
    )
  }, [contentTypes, contentTypeSearch])

  const handleDelete = () => {
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setError(null)
    setIsDeleteModalOpen(false)
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `JWT ${token}`

      const res = await fetch(`/api/page-templates/${effectiveId}`, {
        method: 'DELETE',
        headers
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.errors?.[0]?.message || 'Failed to delete template')
      }

      router.push('/admin/collections/page-templates')
    } catch (err: any) {
      setError(err.message)
      setIsDeleting(false)
    }
  }

  const handleArchive = async () => {
    setIsSubmitting(true)
    setError(null)
    setSavePulse(true)
    setTimeout(() => setSavePulse(false), 500)
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `JWT ${token}`

      const res = await fetch(`/api/page-templates/${effectiveId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'archived' }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.errors?.[0]?.message || 'Failed to archive template')
      }
      
      setStatus('archived')
      setSuccess('Template archived successfully.')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateName) {
      setError('Please fill in all required fields.')
      return
    }
    if (!isGlobal && (!selectedContentType || !activeTenantId)) {
      setError('Please select a Content Type and Tenant for standard templates.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSavePulse(true)
    setTimeout(() => setSavePulse(false), 500)

    try {
      const slug = templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      const payload = {
        name: templateName,
        description: templateDesc,
        slug,
        contentType: isGlobal ? null : selectedContentType?.id,
        archetype,
        tenant: isGlobal ? null : activeTenantId,
        status,
        restrictedAccess,
        locked,
        isGlobal,
        htmlContent,
        layout: [], // Initialize empty, Visual Builder will fill this
      }

      const method = isEditing ? 'PATCH' : 'POST'
      const url = isEditing ? `/api/page-templates/${effectiveId}` : '/api/page-templates'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.errors?.[0]?.message || `Failed to ${isEditing ? 'update' : 'create'} template`)
      }

      const data = await res.json()
      if (!isEditing) {
        router.push(`/admin/collections/page-templates/${data.doc.id}`)
      } else {
        setError(null)
        setUpdatedAt(new Date().toLocaleDateString())
        setSuccess('Template updated successfully.')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!isEditing) {
      setStatus(newStatus as any)
      return
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `JWT ${token}`

      const res = await fetch(`/api/page-templates/${effectiveId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')
      
      setStatus(newStatus as any)
      setSuccess(`Status updated to ${newStatus}`)
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message)
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
    <div className="custom-editor-view overflow-y-auto bg-surface min-h-screen relative scrollbar-thin">
      <TopNavBar 
        breadcrumbs={[
          { label: 'Page Templates', path: '/admin/collections/page-templates' },
          { label: isEditing ? 'Edit Template' : 'Draft Template' },
        ]}
        actions={
          isEditing && (
            <button
              type="button"
              onClick={() => setIsDeployModalOpen(true)}
              className="px-4.5 py-2 bg-primary hover:bg-primary/95 text-white font-label text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border-none focus:outline-none shadow-sm shadow-primary/10 hover:shadow-md hover:-translate-y-0.5"
            >
              <Icon name="publish" size={16} /> Deploy to Site
            </button>
          )
        }
        status={{
          value: status,
          onChange: handleStatusChange,
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Draft', value: 'draft' },
            { label: 'Archived', value: 'archived' },
          ]
        }}
        userProfile={{
          name: user?.name || user?.email || 'Admin',
          role: (user as any)?.role || 'Editor'
        }}
      />
      
      <div className="mx-auto max-w-3xl py-32 px-4">
        <header className={`mb-12 text-center animate-reveal ${revealedIndex >= 0 ? 'is-revealed' : ''}`}>
          <h1 className="font-headline text-4xl lg:text-5xl text-on-background leading-tight mb-4 m-0">
            {isEditing ? 'Edit Template' : 'Draft New Template'}
          </h1>
          <p className="font-body text-on-surface-variant text-lg max-w-2xl leading-relaxed mx-auto m-0 mb-6">
            {isEditing 
              ? 'Modify the structure and mapping for this page archetype. Changes will propagate to all future authoring sessions.'
              : 'Define the structure and mapping for a new page archetype. This template will enforce strict schema adherence for authors.'}
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-4 text-sm text-on-surface-variant font-label bg-surface-container-low px-6 py-3 rounded-full border border-outline-variant/30 hover:shadow-sm transition-shadow duration-200">
            <span className="flex items-center gap-1.5"><Icon name="person" size={16} /> Created by {createdBy}</span>
            {createdAt && (
              <>
                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                <span className="flex items-center gap-1.5">Created {createdAt}</span>
              </>
            )}
            {updatedAt && (
              <>
                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                <span className="flex items-center gap-1.5"><Icon name="update" size={16} /> Last modified {updatedAt}</span>
              </>
            )}
            {isEditing && (
              <>
                <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                <button className="flex items-center gap-1.5 text-primary hover:underline font-medium hover:scale-105 transition-transform border-none bg-transparent cursor-pointer">
                  <Icon name="history" size={16} /> Version History
                </button>
              </>
            )}
          </div>
        </header>

        <form className="space-y-10" onSubmit={handleInitialize}>
          {error && (
            <div className="bg-error-container text-on-error-container p-4 rounded-xl flex items-center gap-3 border border-error/20">
              <Icon name="error" className="text-error" />
              <p className="font-body text-sm font-medium m-0">{error}</p>
            </div>
          )}

          {/* Core Details Section */}
          <section className={`bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] border border-outline-variant/15 animate-reveal hover-lift ${revealedIndex >= 1 ? 'is-revealed' : ''}`}>
            <h2 className="font-headline text-2xl text-on-background mb-6 flex items-center gap-3 m-0">
              <Icon name="design_services" className="text-tertiary" filled />
              Nomenclature & Purpose
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block font-label text-sm uppercase tracking-wider text-on-surface-variant mb-2" htmlFor="templateName">Template Identifier</label>
                <div className="relative focus-within:ring-1 focus-within:ring-primary rounded-lg bg-surface border border-outline-variant/30 transition-all hover:scale-[1.01] hover:shadow-md focus-within:scale-[1.01] focus-within:shadow-md">
                  <input 
                    className="w-full bg-transparent border-none py-3 px-4 text-on-background font-body text-base placeholder:text-outline focus:ring-0 rounded-lg outline-none" 
                    id="templateName" 
                    name="templateName" 
                    placeholder="e.g., Editorial Longform V2" 
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block font-label text-sm uppercase tracking-wider text-on-surface-variant mb-2" htmlFor="templateDesc">Curatorial Description</label>
                <div className="relative focus-within:ring-1 focus-within:ring-primary rounded-lg bg-surface border border-outline-variant/30 transition-all hover:scale-[1.01] hover:shadow-md focus-within:scale-[1.01] focus-within:shadow-md">
                  <textarea 
                    className="w-full bg-transparent border-none py-3 px-4 text-on-background font-body text-base placeholder:text-outline focus:ring-0 rounded-lg resize-y outline-none" 
                    id="templateDesc" 
                    name="templateDesc" 
                    placeholder="Briefly describe when this template should be used by the editorial team..." 
                    rows={3}
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
          </section>

          {/* Status & Governance Section */}
          <section className={`bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] border border-outline-variant/15 animate-reveal hover-lift ${revealedIndex >= 2 ? 'is-revealed' : ''}`}>
            <h2 className="font-headline text-2xl text-on-background mb-6 flex items-center gap-3 m-0">
              <Icon name="verified_user" className="text-primary" filled />
              Status & Governance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block font-label text-sm uppercase tracking-wider text-on-surface-variant mb-2">Lifecycle Status</label>
                  <select 
                    className="w-full bg-surface border border-outline-variant/30 py-3 px-4 text-on-background font-body text-base rounded-lg focus:ring-primary focus:border-primary transition-all hover:border-primary/50 hover:shadow-sm outline-none cursor-pointer"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="font-label text-sm uppercase tracking-wider text-on-background group-hover:text-primary transition-colors">Restricted Access</span>
                    <span className="text-xs text-on-surface-variant">Limit to Editor-in-Chief & Admin roles</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer hover:scale-105 transition-transform duration-200">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={restrictedAccess}
                      onChange={(e) => setRestrictedAccess(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all spring-toggle peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="font-label text-sm uppercase tracking-wider text-on-background group-hover:text-primary transition-colors">Lock Template</span>
                    <span className="text-xs text-on-surface-variant">Prevent accidental schema mapping changes</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer hover:scale-105 transition-transform duration-200">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={locked}
                      onChange={(e) => setLocked(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all spring-toggle peer-checked:bg-primary"></div>
                  </label>
                </div>
                {(user as any)?.role === 'super-admin' && (
                  <div className="flex items-center justify-between group">
                    <div className="flex flex-col">
                      <span className="font-label text-sm uppercase tracking-wider text-on-background group-hover:text-primary transition-colors">Global Template</span>
                      <span className="text-xs text-on-surface-variant">Available to all tenants by default</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer hover:scale-105 transition-transform duration-200">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isGlobal}
                        onChange={(e) => setIsGlobal(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all spring-toggle peer-checked:bg-primary"></div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Content Mapping Section */}
          <section className={`bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] border border-outline-variant/15 animate-reveal hover-lift relative ${isDropdownOpen ? 'z-20' : 'z-0'} ${revealedIndex >= 3 ? 'is-revealed' : ''}`}>
            <header className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="font-headline text-2xl text-on-background mb-2 flex items-center gap-3 m-0">
                  <Icon name="data_object" className="text-primary" filled />
                  Content Type Binding
                </h2>
                <p className="font-body text-sm text-on-surface-variant m-0">Strict 1-to-1 mapping. Select the underlying schema this template will render.</p>
              </div>
              <span className="bg-surface-container-high text-on-surface-variant font-label text-xs uppercase px-3 py-1 rounded-full border border-outline-variant/30">{isGlobal ? 'Optional' : 'Required'}</span>
            </header>

            <div className="relative">
              <label className="sr-only" htmlFor="contentTypeSearch">Search Content Types</label>
              <div 
                className={`relative focus-within:ring-1 focus-within:ring-primary rounded-lg bg-surface border border-outline-variant/30 flex items-center transition-all hover:scale-[1.01] hover:shadow-md focus-within:scale-[1.01] focus-within:shadow-md ${isDropdownOpen ? 'rounded-b-none' : ''}`}
              >
                <Icon name="search" className="text-outline pl-4" />
                <input 
                  className="w-full bg-transparent border-none py-3 px-3 text-on-background font-body text-base placeholder:text-outline focus:ring-0 rounded-lg outline-none" 
                  id="contentTypeSearch" 
                  placeholder={selectedContentType ? selectedContentType.name : "Search schemas (e.g., Article, Author, Product)..."} 
                  type="text"
                  autoComplete="off"
                  value={contentTypeSearch}
                  onChange={(e) => {
                    setContentTypeSearch(e.target.value)
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                <button 
                  className="pr-4 text-outline hover:text-on-background transition-colors border-none bg-transparent cursor-pointer flex items-center" 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsDropdownOpen(!isDropdownOpen)
                  }}
                >
                  <Icon name="expand_more" className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className={`dropdown-content absolute w-full mt-2 bg-surface-container-lowest border border-outline-variant/15 rounded-lg shadow-lg z-20 ${isDropdownOpen ? 'is-open' : ''}`}>
                <ul className="max-h-64 overflow-y-auto font-body py-2 m-0 list-none p-0 scrollbar-thin">
                  {isLoadingContentTypes ? (
                    <li className="px-4 py-3 text-outline text-sm italic">Loading schemas...</li>
                  ) : filteredContentTypes.length > 0 ? (
                    filteredContentTypes.map((ct) => (
                      <li 
                        key={ct.id}
                        className={`px-4 py-3 hover:bg-surface-container-low cursor-pointer flex items-center justify-between group transition-colors ${selectedContentType?.id === ct.id ? 'bg-primary-fixed-dim/20 border-l-2 border-primary' : ''}`}
                        onClick={() => {
                          setSelectedContentType(ct)
                          setIsDropdownOpen(false)
                          setContentTypeSearch('')
                        }}
                      >
                        <div>
                          <span className={`text-on-background font-medium block ${selectedContentType?.id === ct.id ? 'text-primary' : ''}`}>{ct.name}</span>
                          <span className={`text-xs text-outline font-mono mt-1 block ${selectedContentType?.id === ct.id ? 'text-primary/70' : ''}`}>schema: {ct.slug}</span>
                        </div>
                        {selectedContentType?.id === ct.id && (
                          <Icon name="check" className="text-primary text-sm" />
                        )}
                        {selectedContentType?.id !== ct.id && (
                          <Icon name="check" className="text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm" />
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-3 text-outline text-sm">No schemas found for your search.</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* HTML Template Code Section - Visible only if isGlobal is checked or if user is super-admin */}
          {(isGlobal || (user as any)?.role === 'super-admin') && (
            <section className={`bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] border border-outline-variant/15 animate-reveal hover-lift ${revealedIndex >= 3 ? 'is-revealed' : ''}`}>
              <h2 className="font-headline text-2xl text-on-background mb-4 flex items-center gap-3 m-0">
                <Icon name="code" className="text-primary" filled />
                HTML Template Specification
              </h2>
              <p className="font-body text-sm text-on-surface-variant mb-6 m-0">Define the static self-contained HTML and CSS blueprint for this landing page.</p>
              <div>
                <label className="sr-only" htmlFor="htmlContent">HTML Code</label>
                <div className="relative focus-within:ring-1 focus-within:ring-primary rounded-lg bg-surface border border-outline-variant/30 transition-all hover:scale-[1.005] hover:shadow-md focus-within:scale-[1.005] focus-within:shadow-md">
                  <textarea 
                    className="w-full bg-transparent border-none py-3 px-4 text-on-background font-mono text-xs placeholder:text-outline focus:ring-0 rounded-lg resize-y outline-none min-h-[300px]" 
                    id="htmlContent" 
                    name="htmlContent" 
                    placeholder="<!DOCTYPE html>..." 
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </section>
          )}

          {/* Layout Archetype Selection */}
          <section className={`bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] border border-outline-variant/15 relative z-0 animate-reveal hover-lift ${revealedIndex >= 4 ? 'is-revealed' : ''}`}>
            <header className="mb-6">
              <h2 className="font-headline text-2xl text-on-background mb-2 flex items-center gap-3 m-0">
                <Icon name="view_quilt" className="text-secondary" filled />
                Layout Archetype
              </h2>
              <p className="font-body text-sm text-on-surface-variant m-0">Choose a foundational structure to expedite the design process. (Optional)</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Option 1: Longform */}
              <label className="cursor-pointer group relative">
                <input 
                  className="peer sr-only" 
                  name="archetype" 
                  type="radio" 
                  value="longform" 
                  checked={archetype === 'longform'}
                  onChange={() => setArchetype('longform')}
                />
                <div className="h-full border-2 border-outline-variant/30 bg-surface rounded-xl p-4 transition-all duration-300 peer-checked:border-primary peer-checked:bg-primary-container/5 hover:border-outline-variant hover:shadow-md hover:-translate-y-1">
                  <div className="w-full h-24 bg-surface-container-high rounded-lg flex flex-col gap-2 p-2 mb-4 transition-colors duration-300 peer-checked:bg-primary/10 group-hover:bg-surface-container-highest">
                    <div className="h-6 w-full bg-surface-dim rounded-sm"></div>
                    <div className="flex gap-2 h-full">
                      <div className="w-2/3 bg-surface-dim rounded-sm h-full"></div>
                      <div className="w-1/3 bg-surface-dim rounded-sm h-full opacity-50"></div>
                    </div>
                  </div>
                  <h3 className="font-label font-bold text-on-background group-hover:text-primary transition-colors text-sm uppercase tracking-wide mb-1 m-0">Longform Narrative</h3>
                  <p className="font-body text-xs text-on-surface-variant m-0">Focus on immersive text with side-rail metadata.</p>
                </div>
                <div className="absolute top-4 right-4 text-primary opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-300">
                  <Icon name="check_circle" filled />
                </div>
              </label>

              {/* Option 2: Landing */}
              <label className="cursor-pointer group relative">
                <input 
                  className="peer sr-only" 
                  name="archetype" 
                  type="radio" 
                  value="landing" 
                  checked={archetype === 'landing'}
                  onChange={() => setArchetype('landing')}
                />
                <div className="h-full border-2 border-outline-variant/30 bg-surface rounded-xl p-4 transition-all duration-300 peer-checked:border-primary peer-checked:bg-primary-container/5 hover:border-outline-variant hover:shadow-md hover:-translate-y-1">
                  <div className="w-full h-24 bg-surface-container-high rounded-lg flex flex-col gap-2 p-2 mb-4 transition-colors duration-300 peer-checked:bg-primary/10 group-hover:bg-surface-container-highest">
                    <div className="h-8 w-full bg-surface-dim rounded-sm"></div>
                    <div className="grid grid-cols-3 gap-2 h-full">
                      <div className="bg-surface-dim rounded-sm h-full"></div>
                      <div className="bg-surface-dim rounded-sm h-full"></div>
                      <div className="bg-surface-dim rounded-sm h-full"></div>
                    </div>
                  </div>
                  <h3 className="font-label font-bold text-on-background group-hover:text-primary transition-colors text-sm uppercase tracking-wide mb-1 m-0">Landing Page</h3>
                  <p className="font-body text-xs text-on-surface-variant m-0">Modular blocks for campaigns or overviews.</p>
                </div>
                <div className="absolute top-4 right-4 text-primary opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-300">
                  <Icon name="check_circle" filled />
                </div>
              </label>

              {/* Option 3: Minimal */}
              <label className="cursor-pointer group relative">
                <input 
                  className="peer sr-only" 
                  name="archetype" 
                  type="radio" 
                  value="minimal" 
                  checked={archetype === 'minimal'}
                  onChange={() => setArchetype('minimal')}
                />
                <div className="h-full border-2 border-outline-variant/30 bg-surface rounded-xl p-4 transition-all duration-300 peer-checked:border-primary peer-checked:bg-primary-container/5 hover:border-outline-variant hover:shadow-md hover:-translate-y-1">
                  <div className="w-full h-24 bg-surface-container-high rounded-lg flex flex-col items-center justify-center gap-2 p-2 mb-4 transition-colors duration-300 peer-checked:bg-primary/10 group-hover:bg-surface-container-highest">
                    <div className="h-4 w-1/2 bg-surface-dim rounded-sm"></div>
                    <div className="h-2 w-3/4 bg-surface-dim rounded-sm"></div>
                    <div className="h-2 w-2/3 bg-surface-dim rounded-sm"></div>
                  </div>
                  <h3 className="font-label font-bold text-on-background group-hover:text-primary transition-colors text-sm uppercase tracking-wide mb-1 m-0">Archival Minimal</h3>
                  <p className="font-body text-xs text-on-surface-variant m-0">Stripped back layout prioritizing central reading.</p>
                </div>
                <div className="absolute top-4 right-4 text-primary opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-300">
                  <Icon name="check_circle" filled />
                </div>
              </label>
            </div>
          </section>

          {/* Danger Zone */}
          {isEditing && (
            <section className={`bg-error-container/20 p-8 rounded-xl border border-error/20 animate-reveal ${revealedIndex >= 5 ? 'is-revealed' : ''}`}>
              <h2 className="font-headline text-2xl text-error mb-2 flex items-center gap-3 m-0">
                <Icon name="warning" />
                Danger Zone
              </h2>
              <p className="font-body text-sm text-on-surface-variant mb-6 m-0">Irreversible actions for this template. Archiving will preserve data but hide it from authors.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  className="px-6 py-3 rounded-lg font-label uppercase tracking-wide text-sm font-medium border border-outline hover:bg-surface-container-high transition-colors text-on-surface flex-1 sm:flex-none hover:shadow-sm cursor-pointer bg-transparent disabled:opacity-50" 
                  type="button"
                  onClick={handleArchive}
                  disabled={isSubmitting || status === 'archived'}
                >
                  {status === 'archived' ? 'Already Archived' : 'Archive Template'}
                </button>
                <button 
                  className="px-6 py-3 rounded-lg font-label uppercase tracking-wide text-sm font-bold bg-error text-on-error hover:bg-error/90 transition-all flex-1 sm:flex-none shadow-sm hover:shadow-md hover:-translate-y-0.5 border-none cursor-pointer disabled:opacity-50" 
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Template'}
                </button>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className={`pt-8 flex justify-end gap-4 border-t border-surface-variant mt-12 pb-20 animate-reveal ${revealedIndex >= 6 ? 'is-revealed' : ''}`}>
            {isEditing && (
              <button 
                className="px-6 py-3 rounded-lg font-label uppercase tracking-wide text-sm font-bold border-2 border-primary text-primary hover:bg-primary/5 transition-all flex items-center gap-2 cursor-pointer bg-transparent" 
                type="button"
                onClick={() => router.push(`/admin/templates/builder/${effectiveId}`)}
              >
                <Icon name="widgets" size={18} />
                Open Visual Designer
              </button>
            )}
            <button 
              className="px-6 py-3 rounded-lg font-label uppercase tracking-wide text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors border-none bg-transparent cursor-pointer" 
              type="button"
              onClick={() => router.back()}
            >
              Cancel
            </button>
            <button 
              className={`shimmer-effect px-8 py-3 rounded-xl font-label uppercase tracking-wide text-sm font-bold btn-primary-gradient shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${savePulse ? 'save-pulse' : ''}`} 
              type="submit"
              disabled={!templateName || (!isGlobal && !selectedContentType) || isSubmitting}
            >
              <span className="">{isSubmitting ? (isEditing ? 'Saving...' : 'Initializing...') : (isEditing ? 'Save Changes' : 'Initialize Template')}</span>
              <Icon name={isEditing ? 'save' : 'arrow_forward'} className={`text-sm transition-transform duration-300 ${isSubmitting ? 'scale-0' : 'scale-100'}`} />
            </button>
          </div>

        </form>
      </div>

      {/* Floating Success Toast */}
      {success && (
        <div className="fixed bottom-8 right-8 z-[100] animate-fade-slide-up">
          <div className="bg-surface/80 backdrop-blur-[20px] border border-outline-variant/15 modal-shadow rounded-2xl p-4 pr-6 flex items-center gap-4 min-w-[320px]">
            <div className="size-10 rounded-full bg-success-container/20 flex items-center justify-center border border-success/20">
              <Icon name="check_circle" className="text-success" />
            </div>
            <div className="flex-1">
              <p className="font-headline font-bold text-sm text-on-surface m-0">Success</p>
              <p className="font-body text-xs text-outline m-0">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-outline hover:text-on-surface transition-colors border-none bg-transparent cursor-pointer"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Premium Glassmorphic Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Template"
        content={<p className="m-0 leading-relaxed font-body">Are you sure you want to delete this structural template? This action is permanent and cannot be undone.</p>}
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        type="danger"
      />
      {/* Deploy Template Modal */}
      <DeployTemplateModal
        isOpen={isDeployModalOpen}
        templateId={effectiveId || null}
        templateName={templateName}
        templateTenantId={templateTenantId}
        isGlobalTemplate={isGlobal}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  )
}
