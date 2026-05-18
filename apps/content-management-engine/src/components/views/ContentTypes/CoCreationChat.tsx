"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Label } from '@/components/ui/atoms/Label'
import { Card } from '@/components/ui/molecules/Card'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface CoCreationChatProps {
  sessionId: string | null
  onSessionIdChange: (id: string) => void
  currentSchema: any
  onSchemaGenerated: (schema: any) => void
  isGenerating: boolean
  setIsGenerating: (is: boolean) => void
}

// Custom prompt presets aligned with premium co-creation micro-actions
const DYNAMIC_PRESETS = [
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

export const CoCreationChat: React.FC<CoCreationChatProps> = ({
  sessionId,
  onSessionIdChange,
  currentSchema,
  onSchemaGenerated,
  isGenerating,
  setIsGenerating,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your Hermes AI Content Architect. Describe the additions, modifications, or localized structures you would like to apply to this schema, or use one of the quick actions below.',
      timestamp: new Date(),
    },
  ])
  const [inputPrompt, setInputPrompt] = useState('')
  const [statusText, setStatusText] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll chat pane to the latest bubble
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing session messages history if session ID changes
  useEffect(() => {
    if (!sessionId) return

    // Pre-populate system or existing session detail if needed
  }, [sessionId])

  // Abort running requests on component unmount to prevent state updates/memory leaks
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // SSE Stream parser and consumer
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim()
    if (!promptToSend || isGenerating) return

    setInputPrompt('')
    setIsGenerating(true)
    setStatusText('Connecting to AI agent...')

    // Abort previous running request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Set a safety timeout of 45 seconds to abort slow LLM streaming responses
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 45000)

    // Append user message to state
    const newUserMsg: Message = {
      role: 'user',
      content: promptToSend,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newUserMsg])

    // Pre-allocate assistant bubble for real-time delta accumulation
    const newAssistantMsg: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newAssistantMsg])

    try {
      let activeSessionId = sessionId

      // If no active session, initiate a new one
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
        if (activeSessionId) {
          onSessionIdChange(activeSessionId)
        } else {
          throw new Error('Failed to resolve generation session ID.')
        }
      }

      // Start SSE Streaming proxy request
      setStatusText('Generating content layout...')
      const response = await fetch(`/api/content-types/sessions/${activeSessionId}/message`, {
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

      if (!response.ok) {
        throw new Error('Streaming connection failed.')
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
        // Format of chunk: event: EVENT_NAME\ndata: DATA_JSON\n\n
        const eventBoundary = '\n\n'
        let boundaryIndex = streamBuffer.indexOf(eventBoundary)

        while (boundaryIndex !== -1) {
          const chunkStr = streamBuffer.substring(0, boundaryIndex).trim()
          streamBuffer = streamBuffer.substring(boundaryIndex + eventBoundary.length)

          // Extract event type and data JSON
          const eventLines = chunkStr.split('\n')
          let eventType = ''
          let dataStr = ''

          for (const line of eventLines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim()
            } else if (line.startsWith('data:')) {
              dataStr = line.replace('data:', '').trim()
            }
          }

          if (eventType && dataStr) {
            try {
              if (eventType === 'TEXT_DELTA') {
                explanationAccumulator += dataStr
                // Update the last assistant bubble in state
                setMessages((prev) => {
                  const updated = [...prev]
                  if (updated.length > 0) {
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: explanationAccumulator,
                    }
                  }
                  return updated
                })
              } else if (eventType === 'STATE_DELTA') {
                const schemaData = JSON.parse(dataStr)
                if (schemaData && schemaData.fields) {
                  onSchemaGenerated(schemaData)
                }
              } else if (eventType === 'STATUS_UPDATE') {
                if (dataStr === 'completed') {
                  setStatusText(null)
                } else if (dataStr === 'validating') {
                  setStatusText('Enforcing schema constraint isolations...')
                } else if (dataStr === 'self-correcting') {
                  setStatusText('Self-healing JSON formatting anomalies...')
                } else if (dataStr === 'generating') {
                  setStatusText('Invoking LangChain architect reasoning...')
                }
              }
            } catch (err) {
              console.error('Error parsing SSE data line:', err, chunkStr)
            }
          }

          boundaryIndex = streamBuffer.indexOf(eventBoundary)
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: `Generation request timed out or was cancelled by the user.`,
            }
          }
          return updated
        })
      } else {
        console.error(err)
        // Provide clean error message in assistant bubble
        setMessages((prev) => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: `Handshake failed: ${err.message || 'The AI microservice was unable to return a valid stream response.'}`,
            }
          }
          return updated
        })
      }
      setStatusText(null)
    } finally {
      clearTimeout(timeoutId)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setIsGenerating(false)
    }
  }

  return (
    <Card 
      variant="low" 
      className="co-creation-chat flex flex-col h-[680px] bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/15 rounded-2xl shadow-xl shadow-on-surface/5 overflow-hidden font-body"
    >
      {/* Editorial Header (Noto Serif) */}
      <div className="flex items-center justify-between bg-surface-container-low/50 px-5 py-4 border-b border-outline-variant/15 select-none">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
            <span className="material-symbols-outlined text-lg animate-pulse">psychiatry</span>
            {isGenerating && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface-bright animate-ping" />
            )}
          </div>
          <div>
            <Heading level={5} className="font-serif text-sm font-bold text-on-surface leading-tight">
              Architect Companion
            </Heading>
            <span className="block text-[8px] font-label font-bold uppercase tracking-widest text-outline">
              Hermes AI Co-Creation
            </span>
          </div>
        </div>

        {statusText && (
          <Badge size="sm" variant="subtle" color="primary" className="animate-pulse py-0.5 px-2 text-[9px] uppercase tracking-widest">
            {statusText}
          </Badge>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-container-lowest/40">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-slide-up`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed transition-all duration-300 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-primary to-[#1e61cc] text-white shadow-md rounded-tr-none'
                  : 'bg-surface-container-low/60 text-on-surface border border-outline-variant/10 rounded-tl-none shadow-inner shadow-black/[0.02]'
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
              <p className="whitespace-pre-wrap">{msg.content || (isGenerating && idx === messages.length - 1 ? 'Thinking...' : '')}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Preset Action pills area */}
      <div className="px-5 py-3 bg-surface-container-low/20 border-t border-outline-variant/10 select-none">
        <span className="block text-[8px] font-label font-bold uppercase tracking-widest text-outline mb-2">
          Co-Creation Micro Actions
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {DYNAMIC_PRESETS.map((preset) => (
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

      {/* Prompt inputs section */}
      <div className="p-4 bg-surface-container-low border-t border-outline-variant/15 flex gap-3 items-center">
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
          placeholder="Instruct the AI to add, remove, or edit fields..."
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
            <Icon name="send" size={16} />
          )}
        </Button>
      </div>
    </Card>
  )
}
