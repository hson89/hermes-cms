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
}> = ({ sessionId, onEvent, endpoint = '/api/ai/draft', additionalBody = {} }) => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState('')
  const [styleModifiers, setStyleModifiers] = useState<any[]>([])
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    async function fetchStyles() {
      try {
        const res = await fetch('/api/style-modifiers')
        const data = await res.json()
        setStyleModifiers(data.docs || [])
        // Set default if any
        const defaultStyle = data.docs?.find((s: any) => s.isDefault)
        if (defaultStyle) setSelectedStyle(defaultStyle.id)
      } catch (err) {
        console.error('Failed to fetch style modifiers:', err)
      }
    }
    fetchStyles()
  }, [])

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
          style_modifier_id: selectedStyle,
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
                setTokens((prev) => prev + data)
                assistantMessage += data
              } else if (eventType === 'DRAFT_COMPLETE' || eventType === 'REFINE_COMPLETE') {
                onEvent?.({ event: eventType, data })
              } else if (eventType === 'ERROR') {
                console.error('AI Error:', data.detail)
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

  return (
    <div className="flex flex-col h-full bg-surface-dim">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Style Chips */}
        {styleModifiers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {styleModifiers.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedStyle === style.id
                    ? 'bg-tertiary text-on-tertiary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-xl ${
              msg.role === 'user' 
                ? 'bg-primary text-on-primary rounded-tr-sm' 
                : 'bg-surface-container-low text-on-surface rounded-tl-sm border border-outline-variant/15'
            }`}>
              <p className="font-body text-sm leading-relaxed whitespace-pre-wrap m-0">{msg.content}</p>
            </div>
          </div>
        ))}
        {tokens && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-4 rounded-xl bg-surface-container-low text-on-surface rounded-tl-sm border border-outline-variant/15">
              <p className="font-body text-sm leading-relaxed whitespace-pre-wrap m-0 animate-pulse">{tokens}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-outline-variant/15 bg-surface-dim/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Type your instructions..."
            className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-xl py-4 pl-4 pr-12 font-body text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none min-h-[56px] max-h-32"
          />
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
          {loading && (
            <button 
              type="button"
              onClick={handleCancel}
              className="absolute right-12 bottom-3 w-8 h-8 rounded-lg bg-error-container text-error flex items-center justify-center hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
            </button>
          )}
        </form>
        <p className="font-label text-[10px] text-on-surface-variant mt-3 text-center opacity-60">
          Hermes AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
