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
  /** Called once the initialPrompt has been dispatched to the thread. */
  onInitialPromptSent?: () => void
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

interface ParsedBlock {
  type: 'text' | 'tool' | 'json' | 'editorial'
  content?: string
  toolName?: string
  jsonContent?: string
  isComplete?: boolean
  raw: string
}

const parseMessageContent = (text: string): ParsedBlock[] => {
  const blocks: ParsedBlock[] = []
  let currentText = text

  // 1. Extract <final_response> blocks
  const finalResponseStart = currentText.indexOf('<final_response>')
  let editorialContent = ''
  let editorialRaw = ''
  let hasEditorial = false
  let editorialComplete = false

  if (finalResponseStart !== -1) {
    hasEditorial = true
    const startTagLength = '<final_response>'.length
    const finalResponseEnd = currentText.indexOf('</final_response>', finalResponseStart)
    
    if (finalResponseEnd !== -1) {
      editorialContent = currentText.substring(finalResponseStart + startTagLength, finalResponseEnd).trim()
      editorialRaw = currentText.substring(finalResponseStart, finalResponseEnd + '</final_response>'.length)
      editorialComplete = true
    } else {
      editorialContent = currentText.substring(finalResponseStart + startTagLength).trim()
      editorialRaw = currentText.substring(finalResponseStart)
    }
    
    currentText = currentText.replace(editorialRaw, '')
  }

  // 2. Extract tool executions: [Executing tool_name...]
  const toolRegex = /\[Executing\s+([a-zA-Z0-9_-]+)\s*\.\.\.\]/g
  let match: RegExpExecArray | null
  const toolBlocks: { toolName: string; raw: string }[] = []
  
  while ((match = toolRegex.exec(currentText)) !== null) {
    toolBlocks.push({
      toolName: match[1],
      raw: match[0],
    })
  }

  let processedText = currentText
  toolBlocks.forEach((tb, i) => {
    processedText = processedText.replace(tb.raw, `___TOOL_BLOCK_PLACEHOLDER_${i}___`)
  })

  // 3. Extract JSON block
  let jsonStart = -1
  let jsonRaw = ''
  let jsonContent = ''
  let jsonComplete = false

  const mdJsonStart = processedText.indexOf('```json')
  if (mdJsonStart !== -1) {
    const mdJsonEnd = processedText.indexOf('```', mdJsonStart + 7)
    if (mdJsonEnd !== -1) {
      jsonRaw = processedText.substring(mdJsonStart, mdJsonEnd + 3)
      jsonContent = processedText.substring(mdJsonStart + 7, mdJsonEnd).trim()
      jsonComplete = true
      jsonStart = mdJsonStart
    } else {
      jsonRaw = processedText.substring(mdJsonStart)
      jsonContent = processedText.substring(mdJsonStart + 7).trim()
      jsonStart = mdJsonStart
    }
  } else {
    const braceStart = processedText.indexOf('{')
    if (braceStart !== -1) {
      const lastBrace = processedText.lastIndexOf('}')
      if (lastBrace !== -1 && lastBrace > braceStart) {
        jsonRaw = processedText.substring(braceStart, lastBrace + 1)
        jsonContent = jsonRaw
        jsonComplete = true
        jsonStart = braceStart
      } else {
        jsonRaw = processedText.substring(braceStart)
        jsonContent = jsonRaw
        jsonStart = braceStart
      }
    }
  }

  if (jsonStart !== -1) {
    processedText = processedText.replace(jsonRaw, '___JSON_BLOCK_PLACEHOLDER___')
  }

  // 4. Split by placeholders
  const parts = processedText.split(/(___JSON_BLOCK_PLACEHOLDER___|___TOOL_BLOCK_PLACEHOLDER_\d+___)/g)

  parts.forEach(part => {
    if (!part) return

    if (part === '___JSON_BLOCK_PLACEHOLDER___') {
      blocks.push({
        type: 'json',
        jsonContent,
        isComplete: jsonComplete,
        raw: jsonRaw
      })
    } else if (part.startsWith('___TOOL_BLOCK_PLACEHOLDER_')) {
      const matchIndex = parseInt(part.match(/\d+/)![0], 10)
      const tb = toolBlocks[matchIndex]
      if (tb) {
        blocks.push({
          type: 'tool',
          toolName: tb.toolName,
          raw: tb.raw
        })
      }
    } else {
      if (part.trim()) {
        blocks.push({
          type: 'text',
          content: part,
          raw: part
        })
      }
    }
  })

  if (hasEditorial) {
    blocks.push({
      type: 'editorial',
      content: editorialContent,
      isComplete: editorialComplete,
      raw: editorialRaw
    })
  }

  return blocks
}

const ParsedJsonBlock: React.FC<{ block: ParsedBlock }> = ({ block }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  let displayJson = block.jsonContent || ''
  if (block.isComplete && block.jsonContent) {
    try {
      displayJson = JSON.stringify(JSON.parse(block.jsonContent), null, 2)
    } catch (_) {}
  }

  return (
    <div className="my-3 rounded-xl border border-outline-variant/15 bg-surface-container-low/30 overflow-hidden transition-all duration-300 hover:border-primary/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left border-none bg-transparent cursor-pointer hover:bg-surface-container-high/20 transition-colors"
      >
        <div className="flex items-center gap-2 select-none">
          <span className="material-symbols-outlined text-sm text-outline">data_object</span>
          <span className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
            {block.isComplete ? 'Generated Content Structure' : 'Constructing Content Structure'}
          </span>
        </div>
        <div className="flex items-center gap-2 select-none">
          {!block.isComplete && (
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
          )}
          <span className="text-[9px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full font-label font-semibold">
            {block.isComplete ? 'Complete' : 'Streaming'}
          </span>
          <span 
            className="material-symbols-outlined text-sm text-outline transition-transform duration-300"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
          >
            keyboard_arrow_down
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-outline-variant/10 bg-surface-container-lowest/80 p-3 max-h-60 overflow-y-auto custom-scrollbar font-mono text-[9px] text-on-surface-variant leading-relaxed select-text animate-in slide-in-from-top-1 duration-200">
          <pre className="m-0 whitespace-pre-wrap">{displayJson}</pre>
        </div>
      )}
    </div>
  )
}

const MessageContentFormatter: React.FC<{ textContent: string; isUser: boolean }> = ({ textContent, isUser }) => {
  const blocks = useMemo(() => parseMessageContent(textContent), [textContent])

  if (isUser) {
    return <ReactMarkdown components={markdownComponents}>{textContent}</ReactMarkdown>
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        if (block.type === 'text') {
          return (
            <ReactMarkdown key={idx} components={markdownComponents}>
              {block.content || ''}
            </ReactMarkdown>
          )
        }

        if (block.type === 'tool') {
          const toolName = block.toolName || ''
          const toolMeta = {
            image_generator: { label: 'Generating Editorial Image', icon: 'image' },
            schema_resolver: { label: 'Resolving Content Schema', icon: 'schema' }
          }[toolName] || { label: `Running ${toolName}`, icon: 'build' }

          return (
            <div 
              key={idx} 
              className="flex items-center gap-2.5 px-3.5 py-2 my-2 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/10 select-none animate-in fade-in duration-300"
            >
              <span className="material-symbols-outlined text-sm text-primary animate-pulse">{toolMeta.icon}</span>
              <span className="text-[10px] font-label font-bold uppercase tracking-wider text-primary">
                {toolMeta.label}...
              </span>
              <div className="ml-auto flex gap-1">
                <span className="size-1.5 rounded-full bg-primary animate-bounce delay-100" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce delay-200" />
                <span className="size-1.5 rounded-full bg-primary animate-bounce delay-300" />
              </div>
            </div>
          )
        }

        if (block.type === 'json') {
          return <ParsedJsonBlock key={idx} block={block} />
        }

        if (block.type === 'editorial') {
          return (
            <div 
              key={idx} 
              className="my-4 rounded-xl border border-tertiary/20 bg-gradient-to-br from-tertiary/5 via-surface-container-lowest to-surface-container-lowest p-4 relative overflow-hidden shadow-sm select-text animate-in fade-in duration-500"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary" />
              <div className="flex items-center gap-2 mb-2 select-none">
                <span className="material-symbols-outlined text-sm text-tertiary">auto_awesome</span>
                <span className="text-[9px] font-label font-bold uppercase tracking-widest text-tertiary">
                  Editorial Summary
                </span>
                {!block.isComplete && (
                  <span className="ml-auto text-[8px] uppercase tracking-widest text-outline animate-pulse">
                    Typing...
                  </span>
                )}
              </div>
              <div className="text-xs text-on-surface-variant font-body leading-relaxed font-serif">
                <ReactMarkdown components={markdownComponents}>
                  {block.content || ''}
                </ReactMarkdown>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
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
  onInitialPromptSent?: () => void
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
  onInitialPromptSent,
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
      onInitialPromptSent?.()
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
                  <MessageContentFormatter textContent={textContent} isUser={isUser} />
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
  onInitialPromptSent,
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

  // 4. Fetch persistent chat history from the FastAPI service if sessionId is a valid UUID
  const lastLoadedSessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    const sessionIdStr = sessionId ? String(sessionId) : ''
    const isUuid = sessionIdStr.includes('-')
    if (!isUuid || sessionIdStr === lastLoadedSessionIdRef.current) return

    async function loadHistory() {
      try {
        lastLoadedSessionIdRef.current = sessionIdStr
        const res = await fetch(`/api/content-types/sessions/${sessionIdStr}`)
        if (!res.ok) throw new Error('Failed to fetch session history')
        const data = await res.json()
        if (data.context && Array.isArray(data.context) && data.context.length > 0) {
          const mappedMessages = data.context
            .filter((msg: any) => msg.role !== 'system')
            .map((msg: any) => ({
              id: `${sessionIdStr}-msg-${msg.timestamp || Math.random()}`,
              role: msg.role,
              content: [{ type: 'text' as const, text: msg.content }],
            }))
          runtime.thread.reset(mappedMessages)
        }
      } catch (err) {
        console.error('Error loading chat history:', err)
      }
    }

    loadHistory()
  }, [sessionId, runtime])

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
          onInitialPromptSent={onInitialPromptSent}
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
