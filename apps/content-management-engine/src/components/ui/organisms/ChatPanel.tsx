'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  useLocalRuntime,
  AssistantRuntimeProvider,
  ThreadPrimitive,
  useThread,
  useThreadRuntime,
} from '@assistant-ui/react'
import { Icon } from '../atoms/Icon'
import { Heading } from '../atoms/Heading'
import { Badge } from '../atoms/Badge'
import { Card } from '../molecules/Card'
import { CustomSseAdapter } from '../../../services/CustomSseAdapter'

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
  isAiPaused?: boolean
}

// Custom Markdown components to match Alexandria Design System within chat bubbles
const markdownComponents: any = {
  p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 font-body leading-relaxed" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="font-headline text-sm font-bold mb-1.5 text-on-surface" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="font-headline text-xs font-bold mb-1.5 text-on-surface" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="font-headline text-xs font-semibold mb-1 text-on-surface" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-0.5" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-bold text-primary dark:text-inverse-primary" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic opacity-90" {...props} />,
  code: ({ node, inline, ...props }: any) => (
    <code 
      className={`${inline ? 'bg-surface-container-high px-1 py-0.5 rounded text-[10px] font-mono text-primary' : 'block bg-surface-container-high/50 p-2 rounded-lg text-[10px] font-mono my-2 overflow-x-auto'}`} 
      {...props} 
    />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-2 border-primary/30 pl-3 italic my-2 text-on-surface-variant/80" {...props} />
  )
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

// Custom Inner Component to consume the assistant-ui thread context safely
const ThreadContainer: React.FC<{
  mode: 'schema' | 'draft'
  isGenerating: boolean
  setIsGenerating: (is: boolean) => void
  statusText: string | null
  isAiPaused: boolean
  presets: PresetAction[]
  activeIcon: string
  activeTitle: string
  activeSubtitle: string
  initialPrompt?: string | null
  onEvent?: (event: any) => void
}> = ({
  mode,
  isGenerating,
  setIsGenerating,
  statusText,
  isAiPaused,
  presets,
  activeIcon,
  activeTitle,
  activeSubtitle,
  initialPrompt,
  onEvent,
}) => {
  const messages = useThread((s) => s.messages)
  const isRunning = useThread((s) => s.isRunning)
  const threadRuntime = useThreadRuntime()
  const [inputValue, setInputValue] = useState('')
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // Track the actual generating state and bubble it up to parent components
  useEffect(() => {
    setIsGenerating(isRunning)
  }, [isRunning, setIsGenerating])

  // Handle auto-scroll to bottom of conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, statusText])

  // Process Initial Prompt exactly once when initialized
  const hasTriggeredRef = useRef<string | null>(null)
  useEffect(() => {
    if (initialPrompt && !isRunning && hasTriggeredRef.current !== initialPrompt) {
      hasTriggeredRef.current = initialPrompt
      threadRuntime.append({ role: 'user', content: [{ type: 'text' as const, text: initialPrompt }] })
    }
  }, [initialPrompt, isRunning, threadRuntime])

  // Custom styling welcome message if thread is empty
  const welcomeText = mode === 'schema'
    ? 'Hello! I am your Hermes AI Content Architect. Describe the additions, modifications, or localized structures you would like to apply to this schema, or use one of the quick actions below.'
    : 'Hello! I am your Hermes AI Content Drafter. Describe the content you want to create or refine, and I will generate it for you step-by-step.'

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest/30 overflow-hidden font-body">
      
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
        
        {/* Render Welcome message if there are no user messages */}
        {messages.length === 0 && (
          <div className="flex justify-start w-full animate-fade-slide-up">
            <div className="max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed bg-surface-container-low/60 text-on-surface border border-outline-variant/10 rounded-tl-none shadow-inner">
              <div className="flex items-center gap-2 mb-1.5 opacity-60">
                <span className="font-label text-[8px] font-bold uppercase tracking-widest">
                  Hermes Agent
                </span>
              </div>
              <ReactMarkdown components={markdownComponents}>{welcomeText}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Thread Messages */}
        {messages.map((msg) => {
          const textContent = msg.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('')

          const isUser = msg.role === 'user'

          // Handle stream error state if relevant
          const isError = (msg as any).status?.type === 'failed'
          const errorMsg = (msg as any).status?.reason || 'An error occurred during generation.'

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full animate-fade-slide-up`}
            >
              {isError ? (
                <div className="max-w-[85%] bg-error-container text-on-error-container rounded-2xl p-4 border border-error/15 flex items-start gap-3 shadow-sm">
                  <Icon name="error_outline" className="text-error mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="font-label font-bold text-[8px] uppercase tracking-widest text-error">System Error</span>
                    <div className="text-xs font-body leading-relaxed">
                      <ReactMarkdown components={markdownComponents}>{errorMsg}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed transition-all duration-300 ${
                    isUser
                      ? 'bg-surface-container-high text-on-surface border border-outline-variant/15 rounded-tr-none shadow-sm'
                      : 'bg-surface-container-low/60 text-on-surface border border-outline-variant/10 rounded-tl-none shadow-inner'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5 opacity-60">
                    <span className="font-label text-[8px] font-bold uppercase tracking-widest">
                      {isUser ? 'You' : 'Hermes Agent'}
                    </span>
                    {msg.createdAt && (
                      <span className="text-[8px] font-mono">
                        {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <ReactMarkdown components={markdownComponents}>{textContent}</ReactMarkdown>
                </div>
              )}
            </div>
          )
        })}

        {/* Custom generation pipeline checkpoints */}
        {isGenerating && (
          <div className="flex justify-start w-full animate-fade-slide-up">
            <div className="max-w-[85%] rounded-2xl p-4 bg-surface-container-lowest border border-outline-variant/15 rounded-tl-none shadow-sm flex flex-col gap-3">
              <span className="font-label text-[8px] font-bold uppercase tracking-widest text-outline">Generation Pipeline</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon 
                    name={statusText ? "hourglass_empty" : "check_circle"} 
                    className={`!text-sm ${statusText ? "text-primary animate-spin" : "text-tertiary"}`} 
                    filled={!statusText}
                  />
                  <span className={`text-[11px] font-body ${statusText ? "text-on-surface font-medium" : "text-outline line-through"}`}>
                    Connecting & Initializing Handshake
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon 
                    name={statusText === 'Generating content layout...' ? "hourglass_empty" : (statusText === 'Enforcing schema constraints...' || statusText === 'Self-healing JSON errors...' || !statusText ? "check_circle" : "radio_button_unchecked")} 
                    className={`!text-sm ${(statusText === 'Generating content layout...' || statusText === 'Thinking...') ? "text-primary animate-spin" : (statusText === 'Enforcing schema constraints...' || statusText === 'Self-healing JSON errors...' || !statusText ? "text-tertiary" : "text-outline")}`}
                    filled={statusText === 'Enforcing schema constraints...' || statusText === 'Self-healing JSON errors...' || !statusText}
                  />
                  <span className={`text-[11px] font-body ${(statusText === 'Generating content layout...' || statusText === 'Thinking...') ? "text-on-surface font-medium" : (statusText === 'Enforcing schema constraints...' || statusText === 'Self-healing JSON errors...' || !statusText ? "text-outline line-through" : "text-outline")}`}>
                    Analyzing Structural Layout & Fields
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon 
                    name={statusText === 'Enforcing schema constraints...' ? "hourglass_empty" : (statusText === 'Self-healing JSON errors...' || !statusText ? "check_circle" : "radio_button_unchecked")} 
                    className={`!text-sm ${statusText === 'Enforcing schema constraints...' ? "text-primary animate-spin" : (statusText === 'Self-healing JSON errors...' || !statusText ? "text-tertiary" : "text-outline")}`}
                    filled={statusText === 'Self-healing JSON errors...' || !statusText}
                  />
                  <span className={`text-[11px] font-body ${statusText === 'Enforcing schema constraints...' ? "text-on-surface font-medium" : (statusText === 'Self-healing JSON errors...' || !statusText ? "text-outline line-through" : "text-outline")}`}>
                    Synthesizing Narrative Prose
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon 
                    name={statusText === 'Self-healing JSON errors...' ? "hourglass_empty" : (!statusText ? "check_circle" : "radio_button_unchecked")} 
                    className={`!text-sm ${statusText === 'Self-healing JSON errors...' ? "text-primary animate-spin" : (!statusText ? "text-tertiary" : "text-outline")}`}
                    filled={!statusText}
                  />
                  <span className={`text-[11px] font-body ${statusText === 'Self-healing JSON errors...' ? "text-on-surface font-medium" : (!statusText ? "text-outline line-through" : "text-outline")}`}>
                    Validating Editorial Integrity
                  </span>
                </div>
              </div>
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
              disabled={isGenerating || isAiPaused}
              onClick={() => threadRuntime.append({ role: 'user', content: [{ type: 'text' as const, text: preset.prompt }] })}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/50 text-outline hover:text-primary transition-all duration-300 text-[10px] font-medium cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-xs">{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Inputs area */}
      <div className="p-4 bg-surface-container-lowest/30 border-t border-outline-variant/15 shrink-0">
        <div className="bg-surface-container-lowest border border-outline-variant/15 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 rounded-2xl flex items-center gap-2 p-2 shadow-sm transition-all">
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (inputValue.trim() && !isGenerating && !isAiPaused) {
                  threadRuntime.append({ role: 'user', content: [{ type: 'text' as const, text: inputValue }] })
                  setInputValue('')
                }
              }
            }}
            disabled={isGenerating || isAiPaused}
            placeholder={isAiPaused ? "AI is paused. Resume AI in Content Refinement to interact." : "Instruct the AI to create, refine, or edit..."}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none outline-none pl-3 py-2 text-xs text-on-surface placeholder-outline/50 resize-none max-h-24 font-body leading-relaxed disabled:opacity-60"
          />
          
          <button
            type="button"
            disabled={isGenerating || !inputValue.trim() || isAiPaused}
            onClick={() => {
              if (inputValue.trim() && !isGenerating && !isAiPaused) {
                threadRuntime.append({ role: 'user', content: [{ type: 'text' as const, text: inputValue }] })
                setInputValue('')
              }
            }}
            className="size-9 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary flex items-center justify-center border-none flex-shrink-0 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
          >
            {isGenerating ? (
              <span className="size-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
            ) : (
              <Icon name="arrow_upward" size={16} className="text-on-primary" />
            )}
          </button>
        </div>
      </div>

    </div>
  )
}

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
  isAiPaused = false,
}) => {
  // Controlled vs uncontrolled state for generating status text and state
  const [localIsGenerating, setLocalIsGenerating] = useState(false)
  const isGenerating = propIsGenerating !== undefined ? propIsGenerating : localIsGenerating
  const setIsGenerating = propSetIsGenerating || setLocalIsGenerating

  const [statusText, setStatusText] = useState<string | null>(null)

  // 1. Memoize CustomSseAdapter instance to prevent reinstantiation on render
  const customAdapter = useMemo(() => {
    return new CustomSseAdapter({
      sessionId,
      endpoint,
      additionalBody,
      isAiPaused,
      mode,
      onEvent,
      onSchemaGenerated,
      onSessionIdChange,
      currentSchema,
      setStatusText,
    })
  }, [])

  // 2. Proactively update adapter config as props change
  useEffect(() => {
    customAdapter.updateConfig({
      sessionId,
      endpoint,
      additionalBody,
      isAiPaused,
      mode,
      onEvent,
      onSchemaGenerated,
      onSessionIdChange,
      currentSchema,
      setStatusText,
    })
  }, [
    sessionId,
    endpoint,
    additionalBody,
    isAiPaused,
    mode,
    onEvent,
    onSchemaGenerated,
    onSessionIdChange,
    currentSchema,
    customAdapter,
  ])

  // 3. Initialize assistant-ui runtime using our customized adapter
  const runtime = useLocalRuntime(customAdapter)

  const presets = mode === 'schema' ? SCHEMA_PRESETS : DRAFT_PRESETS
  const activeIcon = mode === 'schema' ? 'psychiatry' : 'smart_toy'
  const activeTitle = mode === 'schema' ? 'Architect Companion' : 'Alexandria AI'
  const activeSubtitle = mode === 'schema' ? 'Hermes AI Co-Creation' : 'Content Strategist & Drafter'

  const innerContent = (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root asChild>
        <ThreadContainer
          mode={mode}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          statusText={statusText}
          isAiPaused={!!isAiPaused}
          presets={presets}
          activeIcon={activeIcon}
          activeTitle={activeTitle}
          activeSubtitle={activeSubtitle}
          initialPrompt={initialPrompt}
          onEvent={onEvent}
        />
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
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
