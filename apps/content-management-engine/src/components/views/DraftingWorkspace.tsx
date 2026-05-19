"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { ChatPanel } from '../Editor/ChatPanel'
import { EditorPanel } from '../Editor/EditorPanel'
import { RecoveryDialog } from '../Editor/RecoveryDialog'

/**
 * DraftingWorkspace: Main Split-View AI Content Generation Interface.
 * Satisfies T020, T030b, T043, addressing Review feedback for tenancy and promotion.
 */
export const DraftingWorkspace: React.FC = () => {
  const { contentTypeId } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  // Memoize active tenant to ensure consistent ID passing
  const activeTenantId = useMemo(() => {
    return (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant
  }, [user])

  const [session, setSession] = useState<any>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveredSession, setRecoveredSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<any>(null)
  const [schema, setSchema] = useState<any>(null)

  // 1. Initial Session Setup / Recovery
  useEffect(() => {
    async function initWorkspace() {
      if (!user || !activeTenantId) return
      
      try {
        // Fetch content type schema
        const ctRes = await fetch(`/api/content-types/${contentTypeId}`)
        const ctData = await ctRes.json()
        setContentType(ctData)
        setSchema(ctData.fields)

        // Check for active or expired session
        const sessionRes = await fetch(`/api/ai-drafting/sessions?contentType=${contentTypeId}&tenantId=${activeTenantId}`)
        const sessionData = await sessionRes.json()
        
        if (sessionData.activeSession) {
          if (sessionData.activeSession.status === 'expired') {
            setRecoveredSession(sessionData.activeSession)
            setShowRecovery(true)
          } else {
            setSession(sessionData.activeSession)
          }
        } else {
          // Auto-create new session if none exists
          const createRes = await fetch(`/api/ai-drafting/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType: contentTypeId, tenantId: activeTenantId }),
          })
          const newSession = await createRes.json()
          setSession(newSession)
        }
      } catch (err) {
        console.error('Failed to initialize drafting workspace:', err)
      } finally {
        setLoading(false)
      }
    }

    initWorkspace()
  }, [user, contentTypeId, activeTenantId])

  // 2. Handle AI Events (Streaming field updates)
  const handleAIEvent = useCallback((event: any) => {
    if (event.event === 'DRAFT_COMPLETE' || event.event === 'REFINE_COMPLETE') {
      const { draft } = event.data
      setSession((prev: any) => ({
        ...prev,
        draftData: {
          ...prev.draftData,
          ...draft,
        },
      }))
    }
  }, [])

  // 3. Proactive Lock Release
  useEffect(() => {
    const releaseLock = () => {
      if (!session?.id) return
      navigator.sendBeacon(`/api/ai-drafting/sessions/${session.id}/lock`, JSON.stringify({ status: 'expired' }))
    }

    window.addEventListener('pagehide', releaseLock)
    window.addEventListener('beforeunload', releaseLock)
    
    return () => {
      window.removeEventListener('pagehide', releaseLock)
      window.removeEventListener('beforeunload', releaseLock)
    }
  }, [session?.id])

  // 4. Handle Auto-saves from Editor
  const handleSave = useCallback(async (draftData: any) => {
    if (!session?.id) return
    
    try {
      await fetch(`/api/ai-drafting/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftData, tenantId: activeTenantId }),
      })
    } catch (err) {
      console.error('Failed to auto-save draft:', err)
    }
  }, [session?.id, activeTenantId])

  // 5. Handle Section-level Refinement
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
          content_schema: schema,
          style_modifier_id: session.selectedModel,
          tenantId: activeTenantId
        }),
      })
      const data = await res.json()
      if (data.draft) {
        setSession((prev: any) => ({
          ...prev,
          draftData: data.draft,
        }))
      }
    } catch (err) {
      console.error('Failed to refine all:', err)
    } finally {
      setLoading(false)
    }
  }, [session, schema, activeTenantId])

  // 6. Handle Draft Promotion
  const handlePromote = useCallback(async () => {
    if (!session?.id) return
    setLoading(true)
    
    try {
      const res = await fetch(`/api/ai-drafting/sessions/${session.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: activeTenantId }),
      })
      const contentItem = await res.json()
      if (contentItem.id) {
        router.push(`/admin/collections/content-items/${contentItem.id}`)
      }
    } catch (err) {
      console.error('Failed to promote draft:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.id, activeTenantId, router])

  const handleResume = async () => {
    if (!recoveredSession) return
    try {
      await fetch(`/api/ai-drafting/sessions/${recoveredSession.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', tenantId: activeTenantId }),
      })
      setSession(recoveredSession)
      setShowRecovery(false)
    } catch (err) {
      console.error('Failed to resume session:', err)
    }
  }

  const handleDiscard = async () => {
    if (!recoveredSession) return
    try {
      await fetch(`/api/ai-drafting/sessions/${recoveredSession.id}`, { method: 'DELETE' })
      
      const createRes = await fetch(`/api/ai-drafting/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: contentTypeId, tenantId: activeTenantId }),
      })
      const newSession = await createRes.json()
      setSession(newSession)
      setShowRecovery(false)
    } catch (err) {
      console.error('Failed to discard and start fresh:', err)
    }
  }

  if (loading || !user) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-on-surface-variant font-label">Loading Workspace...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-[calc(100vh-5rem)] flex overflow-hidden">
      {showRecovery && <RecoveryDialog onResume={handleResume} onDiscard={handleDiscard} />}
      
      {/* Left: Chat Interface (surface-dim) */}
      <div className="w-1/3 h-full bg-surface-dim border-r border-outline-variant/15 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-outline-variant/15">
          <h2 className="font-headline text-xl font-bold text-on-surface m-0">Draft with AI</h2>
          <p className="font-label text-xs text-on-surface-variant mt-1">Generating for: {contentType?.name}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatPanel 
            sessionId={session?.id} 
            onEvent={handleAIEvent} 
            endpoint={session?.draftData && Object.keys(session.draftData).length > 0 ? '/api/ai/refine' : '/api/ai/draft'}
            additionalBody={{
              current_draft_json: session?.draftData || {},
              content_schema: schema,
              content_type_slug: contentType?.slug,
              locale: session?.activeLocale || 'en',
              tenantId: activeTenantId
            }}
          />
        </div>
      </div>

      {/* Right: Structured Editor (surface-container-lowest) */}
      <div className="flex-1 h-full bg-surface-container-lowest overflow-hidden flex flex-col">
        <div className="p-6 border-b border-outline-variant/15 flex justify-between items-center">
          <h2 className="font-headline text-xl font-bold text-on-surface m-0">Structured Editor</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => handleRefineAll('Improve overall quality and tone')}
              className="font-label font-semibold text-xs tracking-wide text-primary hover:brightness-110 transition-colors cursor-pointer bg-transparent border-none"
            >
              Refine All
            </button>
            <button className="font-label font-semibold text-xs tracking-wide text-on-surface-variant hover:text-primary transition-colors cursor-pointer bg-transparent border-none">
              Save Snapshot
            </button>
            <button 
              onClick={handlePromote}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label font-semibold text-xs tracking-wide shadow-sm hover:brightness-110 transition-all cursor-pointer"
            >
              Promote to Draft
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-3xl mx-auto">
            <EditorPanel 
              draftData={session?.draftData || {}} 
              schema={schema} 
              onSave={handleSave} 
              onRefine={handleRefineAll}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
