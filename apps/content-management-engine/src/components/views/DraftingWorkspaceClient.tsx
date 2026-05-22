"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { ChatPanel } from '../ui/organisms/ChatPanel'
import { EditorPanel } from '../ui/organisms/EditorPanel'
import { DraftingTemplate } from '../ui/templates/DraftingTemplate'
import { RecoveryDialog } from '../ui/organisms/RecoveryDialog'

/**
 * DraftingWorkspace Page Component.
 * Implements Atomic Design by composing Organisms into a Template.
 */
export const DraftingWorkspaceClient: React.FC = () => {
  const { contentTypeId, id: routeId } = useParams()
  const { id: docId } = useDocumentInfo()
  const id = docId || routeId
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('prompt')
  const { user } = useAuth()
  
  const activeTenantId = useMemo(() => {
    return (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant
  }, [user])

  const [currentTenantId, setCurrentTenantId] = useState<string | number | undefined>(undefined)

  const [session, setSession] = useState<any>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveredSession, setRecoveredSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<any>(null)
  const [schema, setSchema] = useState<any>(null)
  const [styleModifiers, setStyleModifiers] = useState<any[]>([])
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [draftingFields, setDraftingFields] = useState<Set<string>>(new Set())
  const [isAiPaused, setIsAiPaused] = useState(false)
  // Track whether the ?prompt= URL param has already been consumed by the ChatPanel.
  // Until it fires, always use /api/ai/draft so creation prompts hit the right endpoint.
  const [initialPromptSent, setInitialPromptSent] = useState(!initialPrompt)
  const [versions, setVersions] = useState<Array<{ timestamp: Date; label: string; data: any }>>([])
  const [showVersionsDropdown, setShowVersionsDropdown] = useState(false)
  const [showStyleHelp, setShowStyleHelp] = useState(false)

  const effectiveTenantId = useMemo(() => {
    return session?.tenant?.id || session?.tenant || currentTenantId || activeTenantId
  }, [session, currentTenantId, activeTenantId])

  // 1. Initial Session Setup / Recovery
  useEffect(() => {
    async function initWorkspace() {
      if (!user) return
      
      try {
        const isEditingItem = id && id !== 'new' && id !== 'undefined'
        
        let resolvedTenantId = activeTenantId
        if (!resolvedTenantId && user.role === 'super-admin') {
          try {
            const tenantsRes = await fetch('/api/tenants?limit=1')
            if (tenantsRes.ok) {
              const tenantsData = await tenantsRes.json()
              if (tenantsData?.docs?.[0]) {
                resolvedTenantId = tenantsData.docs[0].id
                setCurrentTenantId(resolvedTenantId)
              }
            }
          } catch (err) {
            console.error('Failed to fetch fallback tenant for super-admin:', err)
          }
        }
        
        if (isEditingItem) {
          // Fetch existing ContentItem
          const itemRes = await fetch(`/api/content-items/${id}`)
          if (!itemRes.ok) {
            throw new Error(`Failed to fetch ContentItem: ${itemRes.statusText}`)
          }
          const itemData = await itemRes.json()
          
          // Determine the Content Type ID
          const ctId = typeof itemData.contentType === 'object' ? itemData.contentType.id : itemData.contentType
          
          // Fetch the Content Type schema
          const ctRes = await fetch(`/api/content-types/${ctId}`)
          const ctData = await ctRes.json()
          setContentType(ctData)
          setSchema(ctData.schema?.fields || ctData.fields || [])
          
          // Merge dynamic fieldsData and standard title/content
          const mergedDraftData = {
            title: itemData.title,
            content: itemData.content,
            ...itemData.fieldsData,
          }
          
          // Determine the Tenant ID from the document itself
          const itemTenantId = typeof itemData.tenant === 'object' ? itemData.tenant.id : itemData.tenant
          const finalTenantId = itemTenantId || resolvedTenantId

          if (!finalTenantId) {
            throw new Error('No tenant ID available')
          }

          // Fetch or create drafting session
          const sessionRes = await fetch(`/api/ai-drafting/sessions?contentType=${ctId}&tenantId=${finalTenantId}`)
          const sessionData = await sessionRes.json()
          
          if (sessionData.activeSession) {
            const activeSess = sessionData.activeSession
            activeSess.draftData = mergedDraftData
            setSession(activeSess)
          } else {
            const createRes = await fetch(`/api/ai-drafting/sessions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                contentType: ctId, 
                tenantId: finalTenantId 
              }),
            })
            const newSession = await createRes.json()
            newSession.draftData = mergedDraftData
            
            // Persist the initial draftData to the session immediately
            await fetch(`/api/ai-drafting/sessions/${newSession.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                draftData: mergedDraftData, 
                contentType: ctId,
                tenantId: finalTenantId 
              }),
            })
            setSession(newSession)
          }
        } else {
          if (!resolvedTenantId) return

          // New draft bootstrapping logic
          const isBootstrap = !contentTypeId || contentTypeId === 'new' || contentTypeId === 'undefined'

          if (contentTypeId && !isBootstrap) {
            const ctRes = await fetch(`/api/content-types/${contentTypeId}`)
            const ctData = await ctRes.json()
            setContentType(ctData)
            setSchema(ctData.schema?.fields || ctData.fields || [])
          }

          const query = (contentTypeId && !isBootstrap)
            ? `contentType=${contentTypeId}&tenantId=${resolvedTenantId}`
            : `tenantId=${resolvedTenantId}&status=active`
          
          const sessionRes = await fetch(`/api/ai-drafting/sessions?${query}`)
          const sessionData = await sessionRes.json()
          
          if (sessionData.activeSession) {
            if (sessionData.activeSession.status === 'expired') {
              setRecoveredSession(sessionData.activeSession)
              setShowRecovery(true)
            } else {
              setSession(sessionData.activeSession)
              if (isBootstrap && sessionData.activeSession.contentType) {
                 router.replace(`/admin/draft/${sessionData.activeSession.contentType}`)
              }
            }
          } else {
            const createRes = await fetch(`/api/ai-drafting/sessions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                contentType: isBootstrap ? null : contentTypeId, 
                tenantId: resolvedTenantId 
              }),
            })
            const newSession = await createRes.json()
            setSession(newSession)
          }
        }
      } catch (err) {
        console.error('Failed to initialize drafting workspace:', err)
      } finally {
        setLoading(false)
      }
    }

    initWorkspace()
  }, [user, contentTypeId, id, activeTenantId, router])

  // 2. Fetch Style Modifiers
  useEffect(() => {
    async function fetchStyles() {
      try {
        const res = await fetch('/api/style-modifiers')
        const data = await res.json()
        setStyleModifiers(data.docs || [])
        const defaultStyle = data.docs?.find((s: any) => s.isDefault)
        if (defaultStyle) setSelectedStyle(defaultStyle.id)
      } catch (err) {
        console.error('Failed to fetch style modifiers:', err)
      }
    }
    fetchStyles()
  }, [])

  // 2.5. Track Draft snapshots for versions list
  useEffect(() => {
    const draftData = session?.draftData
    if (!draftData || Object.keys(draftData).length === 0) return
    setVersions(prev => {
      if (prev.length === 0) {
        return [{ timestamp: new Date(), label: 'V1 - Initial Generation', data: draftData }]
      }
      const last = prev[prev.length - 1]
      if (JSON.stringify(last.data) === JSON.stringify(draftData)) {
        return prev
      }
      if (draftingFields.size > 0) {
        return prev
      }
      return [
        ...prev,
        {
          timestamp: new Date(),
          label: `V${prev.length + 1} - AI Refinement / Edit`,
          data: draftData
        }
      ]
    })
  }, [session?.draftData, draftingFields])

  // 3. Handle AI Events
  const handleAIEvent = useCallback(async (event: any) => {
    const { event: eventType, data } = event

    if (eventType === 'SCHEMA_UPDATED') {
      const { contentType: newCT, prompt: carryPrompt } = data
      setContentType(newCT)
      setSchema(newCT.fields || [])
      setSession((prev: any) => {
        if (prev?.id) {
          fetch(`/api/ai-drafting/sessions/${prev.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType: newCT.id, tenantId: effectiveTenantId }),
          }).catch(err => console.error('Failed to persist schema update to session:', err))
        }
        return { ...prev, contentType: newCT.id }
      })
      const queryParam = carryPrompt ? `?prompt=${encodeURIComponent(carryPrompt)}` : ''
      // Use window.history.replaceState to change URL without triggering unmount/remount
      const targetUrl = `/admin/draft/${newCT.id}${queryParam}`
      window.history.replaceState(null, '', targetUrl)
    } else if (eventType === 'FIELD_START') {
      setDraftingFields(prev => new Set(prev).add(data.field))
    } else if (eventType === 'TEXT_DELTA' && data.field) {
      setSession((prev: any) => ({
        ...prev,
        draftData: {
          ...prev.draftData,
          [data.field]: (prev.draftData?.[data.field] || '') + data.delta
        }
      }))
    } else if (eventType === 'FIELD_COMPLETE') {
      setDraftingFields(prev => {
        const next = new Set(prev)
        next.delete(data.field)
        return next
      })
      setSession((prev: any) => ({
        ...prev,
        draftData: { ...prev.draftData, [data.field]: data.value }
      }))
    } else if (eventType === 'IMAGE_READY') {
      setDraftingFields(prev => {
        const next = new Set(prev)
        next.delete(data.field)
        return next
      })
      setSession((prev: any) => ({
        ...prev,
        draftData: { ...prev.draftData, [data.field]: data.url }
      }))
    } else if (eventType === 'DRAFT_COMPLETE' || eventType === 'REFINE_COMPLETE') {
      setDraftingFields(new Set())
      const { draft } = data
      setSession((prev: any) => ({
        ...prev,
        draftData: { ...prev.draftData, ...draft },
      }))
    }
  }, [router])

  const handleSave = useCallback(async (draftData: any) => {
    if (!session?.id) return
    setSession((prev: any) => ({ ...prev, draftData }))
    try {
      if (id && id !== 'new' && id !== 'undefined') {
        const title = draftData.title || draftData.name || draftData.headline || 'Untitled'
        const content = draftData.content || null
        
        await fetch(`/api/content-items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            fieldsData: draftData,
          }),
        })
      }

      await fetch(`/api/ai-drafting/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          draftData, 
          contentType: session.contentType,
          tenantId: effectiveTenantId 
        }),
      })
    } catch (err) {
      console.error('Failed to auto-save draft:', err)
    }
  }, [id, session?.id, session?.contentType, effectiveTenantId])

  const handleRefineAll = useCallback(async (prompt: string) => {
    if (!session?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/refine-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          current_draft_json: session.draftData,
          content_schema: contentType?.schema || { fields: schema || [] },
          style_modifier_id: selectedStyle,
          tenantId: effectiveTenantId
        }),
      })
      const data = await res.json()
      if (data.draft) {
        setSession((prev: any) => ({ ...prev, draftData: data.draft }))
      }
    } catch (err) {
      console.error('Failed to refine all:', err)
    } finally {
      setLoading(false)
    }
  }, [session, schema, contentType, effectiveTenantId, selectedStyle])

  const handleRefineField = useCallback(async (fieldName: string, instruction: string) => {
    if (!session?.id) return
    setDraftingFields(prev => {
      const next = new Set(prev)
      next.add(fieldName)
      return next
    })
    try {
      const res = await fetch('/api/ai/refine-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `For the field '${fieldName}', apply this change: ${instruction}`,
          current_draft_json: { [fieldName]: session.draftData?.[fieldName] || '' },
          content_schema: contentType?.schema || { fields: schema || [] },
          style_modifier_id: selectedStyle,
          tenantId: effectiveTenantId
        }),
      })
      const data = await res.json()
      if (data.draft) {
        setSession((prev: any) => {
          const updatedDraftData = {
            ...prev.draftData,
            [fieldName]: data.draft[fieldName]
          }
          handleSave(updatedDraftData)
          return {
            ...prev,
            draftData: updatedDraftData
          }
        })
      }
    } catch (err) {
      console.error(`Failed to refine field ${fieldName}:`, err)
    } finally {
      setDraftingFields(prev => {
        const next = new Set(prev)
        next.delete(fieldName)
        return next
      })
    }
  }, [session, schema, contentType, effectiveTenantId, selectedStyle, handleSave])

  const handleRegenerateField = useCallback(async (fieldName: string) => {
    await handleRefineField(
      fieldName,
      `Regenerate the '${fieldName}' field to be creative, engaging, and professional based on the other fields.`
    )
  }, [handleRefineField])

  const handlePromote = useCallback(async () => {
    if (!session?.id) return
    setLoading(true)
    try {
      if (id && id !== 'new' && id !== 'undefined') {
        const title = session.draftData?.title || session.draftData?.name || session.draftData?.headline || 'Untitled'
        const content = session.draftData?.content || null
        
        const res = await fetch(`/api/content-items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            fieldsData: session.draftData,
            status: 'published',
          }),
        })
        if (!res.ok) {
          throw new Error('Failed to publish content item')
        }
        router.push(`/admin/collections/content-items`)
      } else {
        const res = await fetch(`/api/ai-drafting/sessions/${session.id}/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: effectiveTenantId }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Unknown error occurred during promotion')
        }
        if (data.id) {
          router.push(`/admin/collections/content-items/${data.id}`)
        } else {
          throw new Error('No content item ID returned from server')
        }
      }
    } catch (err: any) {
      console.error('Failed to promote draft:', err)
      alert(`Promotion Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [id, session?.id, session?.draftData, effectiveTenantId, router])

  const handleResume = async () => {
    if (!recoveredSession) return
    try {
      await fetch(`/api/ai-drafting/sessions/${recoveredSession.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', tenantId: effectiveTenantId }),
      })
      setSession(recoveredSession)
      setShowRecovery(false)
    } catch (err) {
      console.error('Failed to resume session:', err)
    }
  }

  const handleDiscard = async () => {
    if (!recoveredSession) return
    const isBootstrap = (!contentTypeId || contentTypeId === 'new' || contentTypeId === 'undefined') && (!id || id === 'new')
    try {
      await fetch(`/api/ai-drafting/sessions/${recoveredSession.id}`, { method: 'DELETE' })
      const createRes = await fetch(`/api/ai-drafting/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentType: isBootstrap ? null : contentTypeId, 
          tenantId: effectiveTenantId 
        }),
      })
      const newSession = await createRes.json()
      setSession(newSession)
      setShowRecovery(false)
    } catch (err) {
      console.error('Failed to discard and start fresh:', err)
    }
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-pulse text-on-surface-variant font-label">Authenticating...</div>
      </div>
    )
  }

  return (
    <div className="drafting-workspace-view h-full bg-background overflow-hidden flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center transition-all duration-500">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="text-primary font-label font-bold text-xs uppercase tracking-widest animate-pulse">Initializing Oracle...</div>
          </div>
        </div>
      )}

      {showRecovery && <RecoveryDialog onResume={handleResume} onDiscard={handleDiscard} />}
      
      {/* TopAppBar matching 'The Content Oracle' mockup */}
      <header className="flex justify-between items-center px-8 w-full bg-surface-bright/80 dark:bg-surface-container-low/80 backdrop-blur-xl h-16 shrink-0 z-40 border-b border-outline-variant/15">
        <div className="flex items-center gap-6">
          <a 
            className="text-primary dark:text-inverse-primary font-bold border-b-2 border-primary pb-1 font-body text-sm tracking-tight cursor-pointer" 
            onClick={() => router.push('/admin/collections/content-items')}
          >
            Drafts
          </a>
          <a 
            className="text-on-surface-variant dark:text-outline-variant hover:bg-surface-variant/50 dark:hover:bg-surface-container-highest/50 transition-colors px-2 py-1 rounded font-body text-sm tracking-tight cursor-pointer"
            onClick={() => router.push('/admin/collections/content-items')}
          >
            Published
          </a>
          <a 
            className="text-on-surface-variant dark:text-outline-variant hover:bg-surface-variant/50 dark:hover:bg-surface-container-highest/50 transition-colors px-2 py-1 rounded font-body text-sm tracking-tight cursor-pointer"
            onClick={() => router.push('/admin/collections/content-items')}
          >
            Archived
          </a>
        </div>
        
        <div className="flex items-center gap-4 relative">
          {/* History Button & Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowVersionsDropdown(prev => !prev)
                setShowStyleHelp(false)
              }}
              title="View revision history"
              className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">history</span>
            </button>
            {showVersionsDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant/15 shadow-2xl z-50 p-2 font-body animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-outline font-bold border-b border-outline-variant/10 select-none">
                  Revision History
                </div>
                <div className="max-h-60 overflow-y-auto mt-1 custom-scrollbar">
                  {versions.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-outline italic text-center">No revision history yet.</div>
                  ) : (
                    versions.map((ver, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSession((prev: any) => ({ ...prev, draftData: ver.data }))
                          handleSave(ver.data)
                          setShowVersionsDropdown(false)
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-surface-container transition-colors flex flex-col gap-1 cursor-pointer border-none bg-transparent"
                      >
                        <span className="text-xs font-semibold text-on-surface flex items-center justify-between">
                          {ver.label}
                          {JSON.stringify(session?.draftData) === JSON.stringify(ver.data) && (
                            <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">Active</span>
                          )}
                        </span>
                        <span className="text-[9px] text-outline">
                          {ver.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings Button (Active tone/style status) */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowStyleHelp(prev => !prev)
                setShowVersionsDropdown(false)
              }}
              title="Style Settings"
              className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">settings</span>
            </button>
            {showStyleHelp && (
              <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest dark:bg-surface-container-low rounded-xl border border-outline-variant/15 shadow-2xl z-50 p-4 font-body animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-xs font-bold text-on-surface mb-2">Alexandria Drafting Settings</div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-label font-bold uppercase tracking-widest text-outline block mb-1">Tone & Style</label>
                    <select
                      value={selectedStyle || ''}
                      onChange={(e) => setSelectedStyle(e.target.value || null)}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-lg p-2 text-xs font-body text-on-surface focus:outline-none focus:border-primary/50"
                    >
                      <option value="">Default AI Style</option>
                      {styleModifiers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedStyle && (
                    <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20 text-[11px] text-on-surface-variant leading-relaxed">
                      <strong>{styleModifiers.find(s => s.id === selectedStyle)?.name}:</strong>{' '}
                      {styleModifiers.find(s => s.id === selectedStyle)?.description || 'Active tone parameters.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer">
            <span className="material-symbols-outlined text-xl">account_circle</span>
          </button>
          
          <div className="h-6 w-px bg-surface-dim mx-2"></div>
          
          <button 
            onClick={() => handleSave(session?.draftData)}
            className="text-primary font-label uppercase tracking-widest text-xs font-bold hover:underline px-4 py-2 border-none bg-transparent cursor-pointer"
          >
            Save
          </button>
          
          <button 
            onClick={handlePromote}
            className="bg-gradient-to-r from-primary to-surface-tint text-on-primary font-label uppercase tracking-widest text-xs font-bold px-6 py-2 rounded-full hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all border-none cursor-pointer shadow-sm"
          >
            Publish
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <DraftingTemplate
          schemaPresent={!!schema}
          chatPanel={
            <ChatPanel 
              mode="draft"
              isCard={false}
              sessionId={session?.id} 
              onEvent={handleAIEvent} 
              initialPrompt={loading ? null : initialPrompt}
              onInitialPromptSent={() => setInitialPromptSent(true)}
              endpoint={
                // If the URL had a ?prompt= and it hasn't been sent yet,
                // always use the draft endpoint (creation) regardless of existing draftData.
                // Once the initial prompt fires, switch to refine for subsequent messages.
                !initialPromptSent
                  ? '/api/ai/draft'
                  : (session?.draftData && Object.keys(session.draftData).length > 0
                      ? '/api/ai/refine'
                      : '/api/ai/draft')
              }
              additionalBody={{
                current_draft_json: session?.draftData || {},
                content_schema: contentType?.schema || { fields: schema || [] },
                content_type_slug: contentType?.slug,
                locale: session?.activeLocale || 'en',
                tenantId: effectiveTenantId,
                style_modifier_id: selectedStyle
              }}
              isAiPaused={isAiPaused}
            />
          }
          editorPanel={
            <EditorPanel 
              draftData={session?.draftData || {}} 
              draftingFields={draftingFields}
              schema={schema} 
              onSave={handleSave} 
              onRefine={handleRefineAll}
              styleModifiers={styleModifiers}
              selectedStyle={selectedStyle}
              onStyleChange={setSelectedStyle}
              onPromote={handlePromote}
              tenantId={effectiveTenantId}
              onRefineField={handleRefineField}
              onRegenerateField={handleRegenerateField}
              isAiPaused={isAiPaused}
              onPauseToggle={setIsAiPaused}
              versions={versions}
              onViewHistoryToggle={() => setShowVersionsDropdown(prev => !prev)}
            />
          }
        />
      </div>
    </div>
  )
}
