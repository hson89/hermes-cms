'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../atoms/Icon'
import { Heading } from '../atoms/Heading'
import { Text } from '../atoms/Text'
import { Button } from '../atoms/Button'
import { Badge } from '../atoms/Badge'
import { Label } from '../atoms/Label'
import { Card } from '../molecules/Card'

interface Message {
  role: 'user' | 'assistant' | 'error'
  content: string
  timestamp: Date
}

interface PresetAction {
  label: string
  icon: string
  prompt: string
}

export interface ChatPanelProps {
  mode?: 'schema' | 'draft'
  isCard?: boolean
  sessionId: string | null
  onSessionIdChange?: (id: string) => void
  currentSchema?: any
  onSchemaGenerated?: (schema: any) => void
  isGenerating?: boolean
  setIsGenerating?: (is: boolean) => void
  onEvent?: (event: any) => void
  initialPrompt?: string | null
  endpoint?: string
  additionalBody?: any
}

// Custom presets aligned with premium co-creation micro-actions
const SCHEMA_PRESETS: PresetAction[] = [
  {
    label: 'Localize all',
    icon: 'g_translate',
    prompt: 'Make all text fields localized for multi-language support.',
  },
  {
    label: 'Add SEO metadata',
    icon: 'travel_explore',
    prompt: 'Add an SEO metadata field group containing meta title, meta description, and social share image.',
  },
  {
    label: 'Add Status dropdown',
    icon: 'rule',
    prompt: 'Add a required select field named status with options draft, published, and archived.',
  },
  {
    label: 'Add Audit fields',
    icon: 'history',
    prompt: 'Add relationship fields for created_by and updated_by pointing to users collection.',
  }
]

const DRAFT_PRESETS: PresetAction[] = [
  {
    label: 'Refine Tone',
    icon: 'tune',
    prompt: 'Refine the tone of this draft to be highly editorial, professional, and elegant.',
  },
  {
    label: 'Shorten Draft',
    icon: 'compress',
    prompt: 'Condense this draft by approximately 30% while retaining all critical specifications and details.',
  },
  {
    label: 'Add Sensory Depth',
    icon: 'palette',
    prompt: 'Expand on this draft using premium storytelling flow, rich editorial detail, and sophisticated descriptions.',
  },
  {
    label: 'SEO Optimize',
    icon: 'search',
    prompt: 'Enhance the headings, format, and natural keyword density in this draft to make it fully SEO-optimized.',
  }
]

export const ChatPanel: React.FC<ChatPanelProps> = ({
  mode = 'draft',
  isCard = false,
  sessionId,
  onSessionIdChange,
  currentSchema,
  onSchemaGenerated,
  isGenerating: propIsGenerating,
  setIsGenerating: propSetIsGenerating,
  onEvent,
  initialPrompt,
  endpoint = '/api/ai/draft',
  additionalBody = {},
}) => {
  // Controlled vs uncontrolled state for generating flag
  const [localIsGenerating, setLocalIsGenerating] = useState(false)
  const isGenerating = propIsGenerating !== undefined ? propIsGenerating : localIsGenerating
  const setIsGenerating = propSetIsGenerating || setLocalIsGenerating

  const [messages, setMessages] = useState<Message[]>([])
  const [inputPrompt, setInputPrompt] = useState('')
  const [tokens, setTokens] = useState('')
  const [statusText, setStatusText] = useState<string | null>(null)
  
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize welcome assistant message based on active mode
  useEffect(() => {
    const welcomeText = mode === 'schema'
      ? 'Hello! I am your Hermes AI Content Architect. Describe the additions, modifications, or localized structures you would like to apply to this schema, or use one of the quick actions below.'
      : 'Hello! I am your Hermes AI Content Drafter. Describe the content you want to create or refine, and I will generate it for you step-by-step.'
    
    setMessages([
      {
        role: 'assistant',
        content: welcomeText,
        timestamp: new Date(),
      },
    ])
  }, [mode])

  // Scroll chat container to bottom when messages or real-time tokens update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tokens])

  // Process Initial Prompt (from router navigation or quick action)
  const hasTriggeredRef = useRef<string | null>(null)
  useEffect(() => {
    if (initialPrompt && messages.length > 0 && !isGenerating && hasTriggeredRef.current !== initialPrompt) {
      hasTriggeredRef.current = initialPrompt
      handleSendMessage(initialPrompt)
    }
  }, [initialPrompt, messages.length, isGenerating])

  // Abort running requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim()
    if (!promptToSend || isGenerating) return

    setInputPrompt('')
    setIsGenerating(true)
    setTokens('')
    setStatusText(mode === 'schema' ? 'Connecting to AI agent...' : 'Thinking...')

    // Abort active stream request if running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Safety timeout of 45 seconds
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 45000)

    // Append User Bubble
    const newUserMsg: Message = {
      role: 'user',
      content: promptToSend,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newUserMsg])

    try {
      let activeSessionId = sessionId
      let response: Response

      if (mode === 'schema') {
        // In schema mode, check if we need to initialize session first
        if (!activeSessionId) {
          setStatusText('Initializing architect session...')
          const initRes = await fetch('/api/content-types/generate-schema', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              prompt: promptToSend,
              currentSchema: currentSchema || undefined,
            }),
          })

          if (!initRes.ok) {
            throw new Error('Handshake with generation service failed.')
          }

          const initResult = await initRes.json()
          activeSessionId = initResult.sessionId
          if (activeSessionId && onSessionIdChange) {
            onSessionIdChange(activeSessionId)
          } else {
            throw new Error('Failed to resolve generation session ID.')
          }
        }

        // Start SSE Streaming proxy request for schema co-creation
        setStatusText('Generating content layout...')
        response = await fetch(`/api/content-types/sessions/${activeSessionId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: promptToSend,
            currentSchema: currentSchema || undefined,
          }),
        })
      } else {
        // In drafting mode, start normal drafting proxy request
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: promptToSend,
            session_id: activeSessionId,
            ...additionalBody,
          }),
        })
      }

      if (!response.ok) {
        let errorMessage = 'Generation failed'
        try {
          const errText = await response.text()
          if (errText) {
            try {
              const errData = JSON.parse(errText)
              if (errData.detail) {
                if (Array.isArray(errData.detail)) {
                  errorMessage = errData.detail
                    .map((d: any) => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg || JSON.stringify(d)}`)
                    .join(', ')
                } else if (typeof errData.detail === 'string') {
                  errorMessage = errData.detail
                } else {
                  errorMessage = JSON.stringify(errData.detail)
                }
              } else {
                errorMessage = errData.error || errData.message || errorMessage
              }
            } catch (_) {
              errorMessage = errText
            }
          }
        } catch (_) {}
        throw new Error(errorMessage)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Readable stream not supported in response.')
      }

      const decoder = new TextDecoder('utf-8')
      let streamBuffer = ''
      let explanationAccumulator = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        streamBuffer += decoder.decode(value, { stream: true })
        
        // Parse event stream format (SSE)
        const eventBoundary = '\n\n'
        let boundaryIndex = streamBuffer.indexOf(eventBoundary)

        while (boundaryIndex !== -1) {
          const chunkStr = streamBuffer.substring(0, boundaryIndex).trim()
          streamBuffer = streamBuffer.substring(boundaryIndex + eventBoundary.length)

          const eventLines = chunkStr.split('\n')
          let eventType = 'message'
          let dataStr = ''

          for (const line of eventLines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim()
            } else if (line.startsWith('data:')) {
              dataStr = line.replace('data:', '').trim()
            }
          }

          if (dataStr) {
            try {
              if (eventType === 'ERROR') {
                const data = JSON.parse(dataStr)
                throw new Error(data.detail || data.message || JSON.stringify(data))
              }

              if (eventType === 'TEXT_DELTA') {
                const delta = dataStr.startsWith('{') || dataStr.startsWith('[')
                  ? JSON.parse(dataStr)
                  : dataStr

                const textSegment = typeof delta === 'string' ? delta : (delta.delta || '')
                explanationAccumulator += textSegment
                setTokens(explanationAccumulator)
                
                // Propagate event up for field-level updates in drafting
                if (typeof delta === 'object' && delta.field) {
                  onEvent?.({ event: eventType, data: delta })
                }
              } else if (eventType === 'STATE_DELTA') {
                const schemaData = JSON.parse(dataStr)
                if (schemaData && schemaData.fields && onSchemaGenerated) {
                  onSchemaGenerated(schemaData)
                }
              } else if (eventType === 'STATUS_UPDATE') {
                if (dataStr === 'completed') {
                  setStatusText(null)
                } else if (dataStr === 'validating') {
                  setStatusText('Enforcing schema constraints...')
                } else if (dataStr === 'self-correcting') {
                  setStatusText('Self-healing JSON errors...')
                } else if (dataStr === 'generating') {
                  setStatusText('Thinking...')
                }
              } else {
                // Propagate other general events (SCHEMA_UPDATED, FIELD_COMPLETE, etc.)
                let parsed = dataStr
                try {
                  parsed = JSON.parse(dataStr)
                } catch (_) {}
                onEvent?.({ event: eventType, data: parsed })
              }
            } catch (err) {
              console.error('Error parsing SSE data line:', err, chunkStr)
            }
          }

          boundaryIndex = streamBuffer.indexOf(eventBoundary)
        }
      }

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: explanationAccumulator,
        timestamp: new Date(),
      }])
      setTokens('')
      setStatusText(null)

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'error',
            content: 'Generation request timed out or was cancelled.',
            timestamp: new Date(),
          }
        ])
      } else {
        console.error(err)
        setMessages((prev) => [
          ...prev,
          {
            role: 'error',
            content: err.message || 'An unexpected error occurred. Please verify that the services are active.',
            timestamp: new Date(),
          }
        ])
      }
      setStatusText(null)
    } finally {
      clearTimeout(timeoutId)
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }

  const presets = mode === 'schema' ? SCHEMA_PRESETS : DRAFT_PRESETS
  const activeIcon = mode === 'schema' ? 'psychiatry' : 'smart_toy'
  const activeTitle = mode === 'schema' ? 'Architect Companion' : 'Alexandria AI'
  const activeSubtitle = mode === 'schema' ? 'Hermes AI Co-Creation' : 'Content Strategist & Drafter'

  // The base CSS layout of our chat interface
  const innerContent = (
    <>
      {/* Premium Editorial Header */}
      <div className="flex items-center justify-between bg-surface-container-low/50 px-5 py-4 border-b border-outline-variant/15 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
            <span className="material-symbols-outlined text-lg animate-pulse">{activeIcon}</span>
            {isGenerating && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-bright animate-ping" />
            )}
          </div>
          <div>
            <Heading level={5} className="font-serif text-sm font-bold text-on-surface leading-tight">
              {activeTitle}
            </Heading>
            <span className="block text-[8px] font-label font-bold uppercase tracking-widest text-outline">
              {activeSubtitle}
            </span>
          </div>
        </div>

        {statusText && (
          <Badge size="sm" variant="subtle" color="primary" className="animate-pulse py-0.5 px-2 text-[9px] uppercase tracking-widest">
            {statusText}
          </Badge>
        )}
      </div>

      {/* Bubble Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-container-lowest/40 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full animate-fade-slide-up`}
          >
            {msg.role === 'error' ? (
              <div className="max-w-[85%] bg-error-container text-on-error-container rounded-2xl p-4 border border-error/15 flex items-start gap-3 shadow-sm">
                <Icon name="error_outline" className="text-error mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  <span className="font-label font-bold text-[8px] uppercase tracking-widest text-error">System Error</span>
                  <p className="text-xs font-body leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed transition-all duration-300 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-primary to-[#1e61cc] text-white shadow-md rounded-tr-none'
                    : 'bg-surface-container-low/60 text-on-surface border border-outline-variant/10 rounded-tl-none shadow-inner'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                  <span className="font-label text-[8px] font-bold uppercase tracking-widest">
                    {msg.role === 'user' ? 'You' : 'Hermes Agent'}
                  </span>
                  <span className="text-[8px] font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            )}
          </div>
        ))}

        {tokens && (
          <div className="flex justify-start w-full">
            <div className="max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed bg-surface-container-low/60 text-on-surface border border-outline-variant/10 rounded-tl-none shadow-inner typing-cursor">
              <div className="flex items-center gap-2 mb-1.5 opacity-60">
                <span className="font-label text-[8px] font-bold uppercase tracking-widest">Hermes Agent</span>
              </div>
              <p className="whitespace-pre-wrap">{tokens}</p>
            </div>
          </div>
        )}

        {isGenerating && !tokens && (
          <div className="flex justify-start">
            <div className="bg-surface-container-low/60 border border-outline-variant/10 text-on-surface px-4 py-3 rounded-2xl flex items-center gap-2 shadow-inner">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Preset Action Pills */}
      <div className="px-5 py-3 bg-surface-container-low/20 border-t border-outline-variant/10 select-none shrink-0">
        <span className="block text-[8px] font-label font-bold uppercase tracking-widest text-outline mb-2">
          Co-Creation Micro Actions
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={isGenerating}
              onClick={() => handleSendMessage(preset.prompt)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/50 text-outline hover:text-primary transition-all duration-300 text-[10px] font-medium cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-xs">{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Inputs area */}
      <div className="p-4 bg-surface-container-low border-t border-outline-variant/15 flex gap-3 items-center shrink-0">
        <textarea
          rows={1}
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          disabled={isGenerating}
          placeholder="Instruct the AI to create, refine, or edit..."
          className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant/15 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 outline-none p-3 text-xs text-on-surface placeholder-outline/50 resize-none max-h-24 font-body leading-relaxed transition-all"
        />

        <Button
          type="button"
          disabled={isGenerating || !inputPrompt.trim()}
          onClick={() => handleSendMessage()}
          className="size-10 rounded-xl bg-gradient-to-r from-primary to-[#1e61cc] flex items-center justify-center text-white border-none flex-shrink-0 transition-transform active:scale-95"
        >
          {isGenerating ? (
            <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Icon name="arrow_forward" size={16} />
          )}
        </Button>
      </div>
    </>
  )

  if (isCard) {
    return (
      <Card
        variant="low"
        className="co-creation-chat flex flex-col h-[680px] bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/15 rounded-2xl shadow-xl shadow-on-surface/5 overflow-hidden font-body"
      >
        {innerContent}
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest/30 overflow-hidden font-body">
      {innerContent}
    </div>
  )
}
