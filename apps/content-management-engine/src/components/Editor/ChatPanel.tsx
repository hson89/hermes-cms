"use client"

import React, { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const ChatPanel: React.FC<{
  sessionId?: string
  onEvent?: (event: any) => void
  endpoint?: string
  additionalBody?: any
  initialPrompt?: string | null
}> = ({ 
  sessionId, 
  onEvent, 
  endpoint = '/api/ai/draft', 
  additionalBody = {},
  initialPrompt
}) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
      setTokens('')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, tokens])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    setTokens('')

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userMessage,
          sessionId,
          ...additionalBody
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.replace('event: ', '').trim()
            const dataLine = lines[lines.indexOf(line) + 1]
            if (dataLine && dataLine.startsWith('data: ')) {
              const data = JSON.parse(dataLine.replace('data: ', '').trim())
              
              if (eventType === 'TEXT_DELTA') {
                const delta = typeof data === 'string' ? data : (data.delta || '')
                setTokens((prev) => prev + delta)
                assistantMessage += delta
                // Also pass to parent if it's a field update
                if (typeof data === 'object' && data.field) {
                  onEvent?.({ event: eventType, data })
                }
              } else {
                onEvent?.({ event: eventType, data })
              }
            }
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }])
      setTokens('')
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('Chat Error:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  // Auto-trigger initial prompt
  const hasTriggeredRef = useRef(false)
  useEffect(() => {
    if (initialPrompt && !hasTriggeredRef.current && sessionId) {
      hasTriggeredRef.current = true
      // We need to pass the prompt directly because state updates are async
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent
      const triggerInitial = async () => {
        const userMessage = initialPrompt.trim()
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)
        setTokens('')

        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt: userMessage,
              sessionId,
              ...additionalBody
            }),
            signal: controller.signal,
          })

          if (!response.ok) throw new Error('Failed to send message')

          const reader = response.body?.getReader()
          if (!reader) throw new Error('No reader')

          const decoder = new TextDecoder()
          let assistantMessage = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                const eventType = line.replace('event: ', '').trim()
                const dataLine = lines[lines.indexOf(line) + 1]
                if (dataLine && dataLine.startsWith('data: ')) {
                  const data = JSON.parse(dataLine.replace('data: ', '').trim())
                  
                  if (eventType === 'TEXT_DELTA') {
                    const delta = typeof data === 'string' ? data : (data.delta || '')
                    setTokens((prev) => prev + delta)
                    assistantMessage += delta
                    if (typeof data === 'object' && data.field) {
                      onEvent?.({ event: eventType, data })
                    }
                  } else {
                    onEvent?.({ event: eventType, data })
                  }
                }
              }
            }
          }

          setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }])
          setTokens('')
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log('Request aborted')
          } else {
            console.error('Chat Error:', err)
          }
        } finally {
          setLoading(false)
        }
      }
      triggerInitial()
    }
  }, [initialPrompt, sessionId, endpoint, additionalBody, onEvent])

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-6 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-lowest/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center">
            <span className="material-symbols-outlined !text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          </div>
          <div>
            <h3 className="font-headline text-lg font-bold m-0 leading-tight">Alexandria AI</h3>
            <p className="font-label text-xs text-on-surface-variant m-0">Content Strategist & Drafter</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 items-start ${msg.role === 'user' ? 'flex-row-reverse self-end max-w-[90%]' : 'max-w-[90%]'}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
              msg.role === 'user' ? 'bg-surface-variant text-on-surface-variant' : 'bg-primary-container text-primary'
            }`}>
              <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: msg.role === 'assistant' ? "'FILL' 1" : undefined }}>
                {msg.role === 'user' ? 'person' : 'smart_toy'}
              </span>
            </div>
            <div className={`p-5 rounded-2xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary-container text-on-primary-container rounded-tr-sm' 
                : 'bg-surface-container-lowest rounded-tl-sm ghost-border'
            }`}>
              <p className="font-body text-sm leading-relaxed whitespace-pre-wrap m-0">{msg.content}</p>
            </div>
          </div>
        ))}
        {tokens && (
          <div className="flex gap-4 items-start max-w-[90%]">
            <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex-shrink-0 flex items-center justify-center text-sm">
              <span className="material-symbols-outlined !text-base" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            </div>
            <div className="p-5 rounded-2xl shadow-sm bg-surface-container-lowest rounded-tl-sm ghost-border">
              <p className="font-body text-sm leading-relaxed whitespace-pre-wrap m-0 typing-cursor">{tokens}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-outline-variant/15 bg-surface-container-lowest">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Guide the draft further..."
            className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-4 pr-12 text-sm font-body focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all ghost-border"
          />
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 w-8 h-8 flex items-center justify-center text-primary bg-primary-container rounded-lg hover:opacity-80 transition-opacity border-none cursor-pointer"
          >
            <span className="material-symbols-outlined !text-lg">send</span>
          </button>
          {loading && (
            <button 
              type="button"
              onClick={handleCancel}
              className="absolute right-12 w-8 h-8 flex items-center justify-center text-error bg-error-container rounded-lg hover:opacity-80 transition-opacity border-none cursor-pointer"
            >
              <span className="material-symbols-outlined !text-lg">stop</span>
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
