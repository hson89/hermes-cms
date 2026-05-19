'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../atoms/Icon'

export const ChatPanel: React.FC<{
  sessionId: string
  onEvent?: (event: any) => void
  initialPrompt?: string | null
  endpoint?: string
  additionalBody?: any
}> = ({ sessionId, onEvent, initialPrompt, endpoint = '/api/ai/draft', additionalBody = {} }) => {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, tokens])

  // Handle Initial Prompt (from URL or redirect)
  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !loading) {
      handleSend(initialPrompt)
    }
  }, [initialPrompt])

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return
    
    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setTokens('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          session_id: sessionId,
          ...additionalBody
        }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              const eventType = line.replace('event: ', '').trim()
              const dataLine = lines[lines.indexOf(line) + 1]
              if (!dataLine || !dataLine.startsWith('data: ')) continue
              
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
    } catch (err) {
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest/30">
      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-body leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary text-on-primary shadow-sm' 
                : 'bg-surface-container-high text-on-surface'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {tokens && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm font-body leading-relaxed bg-surface-container-high text-on-surface typing-cursor">
              {tokens}
            </div>
          </div>
        )}
        {loading && !tokens && (
          <div className="flex justify-start">
            <div className="bg-surface-container-high text-on-surface px-4 py-3 rounded-2xl flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(input)
              }
            }}
            placeholder="Type your content instructions..."
            className="w-full bg-surface-container-high border-none rounded-2xl py-4 pl-5 pr-14 text-sm font-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all resize-none min-h-[56px] max-h-[200px]"
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer border-none"
          >
            <Icon name="arrow_forward" className="!text-xl" />
          </button>
        </div>
        <p className="text-[10px] text-center text-outline-variant mt-3 font-label uppercase tracking-widest">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
