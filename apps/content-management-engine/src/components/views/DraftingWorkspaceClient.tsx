"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { ChatPanel } from '../ui/organisms/ChatPanel'
import { EditorPanel } from '../ui/organisms/EditorPanel'
import { DraftingTemplate } from '../ui/templates/DraftingTemplate'
import { RecoveryDialog } from '../ui/organisms/RecoveryDialog'

/**
 * DraftingWorkspace Page Component.
 * Implements Atomic Design by composing Organisms into a Template.
 */
export const DraftingWorkspaceClient: React.FC = () => {
  const { contentTypeId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('prompt')
  const { user } = useAuth()
  
  const activeTenantId = useMemo(() => {
    return (user as any)?.tenants?.[0]?.tenant?.id || (user as any)?.tenants?.[0]?.tenant
  }, [user])

  const [session, setSession] = useState<any>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveredSession, setRecoveredSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<any>(null)
  const [schema, setSchema] = useState<any>(null)
  const [styleModifiers, setStyleModifiers] = useState<any[]>([])
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [draftingFields, setDraftingFields] = useState<Set<string>>(new Set())

  // 1. Initial Session Setup / Recovery
  useEffect(() => {
    async function initWorkspace() {
      if (!user || !activeTenantId) return
      
      try {
        if (contentTypeId && contentTypeId !== 'new') {
          const ctRes = await fetch(`/api/content-types/${contentTypeId}`)
          const ctData = await ctRes.json()
          setContentType(ctData)
          setSchema(ctData.fields)
        }

        const query = contentTypeId && contentTypeId !== 'new' 
          ? `contentType=${contentTypeId}&tenantId=${activeTenantId}`
          : `tenantId=${activeTenantId}&status=active`
        
        const sessionRes = await fetch(`/api/ai-drafting/sessions?${query}`)
        const sessionData = await sessionRes.json()
        
        if (sessionData.activeSession) {
          if (sessionData.activeSession.status === 'expired') {
            setRecoveredSession(sessionData.activeSession)
            setShowRecovery(true)
          } else {
            setSession(sessionData.activeSession)
            if (contentTypeId === 'new' && sessionData.activeSession.contentType) {
               router.replace(`/admin/draft/${sessionData.activeSession.contentType}`)
            }
          }
        } else {
          const createRes = await fetch(`/api/ai-drafting/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contentType: contentTypeId === 'new' ? null : contentTypeId, 
              tenantId: activeTenantId 
            }),
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
  }, [user, contentTypeId, activeTenantId, router])

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

  // 3. Handle AI Events
  const handleAIEvent = useCallback(async (event: any) => {
    const { event: eventType, data } = event

    if (eventType === 'SCHEMA_UPDATED') {
      const { contentType: newCT, prompt: carryPrompt } = data
      setContentType(newCT)
      setSchema(newCT.fields || [])
      setSession((prev: any) => ({ ...prev, contentType: newCT.id }))
      const queryParam = carryPrompt ? `?prompt=${encodeURIComponent(carryPrompt)}` : ''
      router.replace(`/admin/draft/${newCT.id}${queryParam}`)
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
          style_modifier_id: selectedStyle,
          tenantId: activeTenantId
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
  }, [session, schema, activeTenantId, selectedStyle])

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

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="animate-pulse text-on-surface-variant font-label">Authenticating...</div>
      </div>
    )
  }

  return (
    <div className="drafting-workspace-view h-full bg-background overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center transition-all duration-500">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="text-primary font-label font-bold text-xs uppercase tracking-widest animate-pulse">Initializing Oracle...</div>
          </div>
        </div>
      )}

      {showRecovery && <RecoveryDialog onResume={handleResume} onDiscard={handleDiscard} />}
      
      <DraftingTemplate
        schemaPresent={!!schema}
        chatPanel={
          <ChatPanel 
            mode="draft"
            isCard={false}
            sessionId={session?.id} 
            onEvent={handleAIEvent} 
            initialPrompt={initialPrompt}
            endpoint={session?.draftData && Object.keys(session.draftData).length > 0 ? '/api/ai/refine' : '/api/ai/draft'}
            additionalBody={{
              current_draft_json: session?.draftData || {},
              content_schema: schema,
              content_type_slug: contentType?.slug,
              locale: session?.activeLocale || 'en',
              tenantId: activeTenantId,
              style_modifier_id: selectedStyle
            }}
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
          />
        }
      />
    </div>
  )
}
