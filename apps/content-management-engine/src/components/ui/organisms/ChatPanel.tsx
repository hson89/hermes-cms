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
import { mapSessionHistoryToMessages, shouldLoadHistory, isSchemaReuseMessage } from '../../../services/chat-history'

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
  draftingFields?: Set<string>
  draftData?: any
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
  bestMatch?: any
  alternatives?: any[]
  onSelectAlternative?: (ct: any) => void
  schemaSwitched?: boolean
  onSchemaSwitchedSent?: () => void
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
        <div className="border-t border-outline-variant/15 bg-surface-container-lowest/80 p-3 max-h-60 overflow-y-auto custom-scrollbar font-mono text-[9px] text-on-surface-variant leading-relaxed select-text animate-in slide-in-from-top-1 duration-200">
          <pre className="m-0 whitespace-pre-wrap">{displayJson}</pre>
        </div>
      )}
    </div>
  )
}

const MessageContentFormatter: React.FC<{
  textContent: string
  isUser: boolean
}> = ({ textContent, isUser }) => {
  const blocks = useMemo(() => parseMessageContent(textContent), [textContent])

  if (isUser) {
    return <ReactMarkdown components={markdownComponents}>{textContent}</ReactMarkdown>
  }

  const isSchemaMatch = isSchemaReuseMessage(isUser ? 'user' : 'assistant', textContent)

  // When the bootstrap flow emits "Reusing existing content type:" inline in a message,
  // render just the text (the persistent SchemaBanner above the thread handles the schema card).
  if (isSchemaMatch) {
    return (
      <div className="space-y-2 font-body animate-in fade-in duration-500">
        <ReactMarkdown components={markdownComponents}>
          {textContent}
        </ReactMarkdown>
      </div>
    )
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
              className="flex items-center gap-2.5 px-3.5 py-2 my-2 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/15 select-none animate-in fade-in duration-300"
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
              className="my-4 rounded-xl border border-tertiary/20 bg-gradient-to-br from-tertiary/5 via-surface-container-lowest to-surface-container-lowest p-4 relative overflow-hidden select-text animate-in fade-in duration-500"
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

// Persistent schema banner — always visible when a bestMatch content type is known
const SchemaBanner: React.FC<{
  bestMatch: any
  alternatives?: any[]
  onSelectAlternative?: (ct: any) => void
}> = ({ bestMatch, alternatives, onSelectAlternative }) => {
  const [showAlts, setShowAlts] = useState(false)

  return (
    <div className="mx-4 mt-3 mb-1 animate-in fade-in duration-400">
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-base">schema</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-label font-bold uppercase tracking-widest text-primary">
                  <span className="material-symbols-outlined text-[9px]">check_circle</span>
                  Active Schema
                </span>
              </div>
              <p className="text-xs font-bold text-on-surface leading-none">{bestMatch.name}</p>
              {bestMatch.description && (
                <p className="text-[10px] text-outline mt-0.5">{bestMatch.description}</p>
              )}
            </div>
          </div>

          {alternatives && alternatives.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAlts(!showAlts)}
              className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-lg px-2.5 py-1.5"
            >
              <span className="material-symbols-outlined text-[11px]">swap_horiz</span>
              {showAlts ? 'Hide' : 'Change Schema'}
            </button>
          )}
        </div>

        {showAlts && alternatives && alternatives.length > 0 && (
          <div className="space-y-2 pt-3 mt-3 border-t border-outline-variant/15 animate-in slide-in-from-top-1 duration-200">
            <p className="text-[9px] uppercase font-bold text-outline tracking-wider font-label">Switch to a different schema</p>
            <div className="flex flex-wrap gap-2">
              {alternatives.map((alt: any) => (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => {
                    onSelectAlternative?.(alt)
                    setShowAlts(false)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant/15 bg-surface-container hover:bg-surface-container-high hover:border-primary/30 text-xs font-medium text-on-surface-variant cursor-pointer transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[11px]">schema</span>
                  {alt.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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
  currentSchema?: any
  draftingFields?: Set<string>
  draftData?: any
  historyLoaded?: boolean
  schemaSwitched?: boolean
  onSchemaSwitchedSent?: () => void
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
  currentSchema,
  draftingFields,
  draftData,
  historyLoaded,
  schemaSwitched,
  onSchemaSwitchedSent,
}) => {
  const messages = useThread((s) => s.messages)
  const isRunning = useThread((s) => s.isRunning)
  const threadRuntime = useThreadRuntime()
  const [inputValue, setInputValue] = useState('')
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const fields = useMemo(() => {
    if (!currentSchema) return []
    if (Array.isArray(currentSchema)) return currentSchema
    if (currentSchema.fields && Array.isArray(currentSchema.fields)) return currentSchema.fields
    return []
  }, [currentSchema])

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

  // Listen for background schema updates to automatically notify the AI agent and revise plan
  const lastSchemaRef = useRef<any>(null)
  useEffect(() => {
    if (lastSchemaRef.current !== null && currentSchema) {
      const oldFieldsStr = JSON.stringify(lastSchemaRef.current)
      const newFieldsStr = JSON.stringify(currentSchema)
      
      if (oldFieldsStr !== newFieldsStr) {
        console.log("ThreadContainer: schema change detected, appending system notification message.")
        threadRuntime.append({
          role: 'user',
          content: [
            {
              type: 'text' as const,
              text: 'The content type schema has been updated. Please revise the plan to match the new schema fields and update the draft accordingly.',
            },
          ],
        })
      }
    }
    if (currentSchema) {
      lastSchemaRef.current = currentSchema
    }
  }, [currentSchema, threadRuntime])

  // If schema was switched via query parameter, append a system/user instruction to revise plan once history is loaded
  useEffect(() => {
    if (schemaSwitched && historyLoaded && !isRunning && threadRuntime) {
      console.log("ThreadContainer: schemaSwitched detected and history loaded, appending system notification message.")
      threadRuntime.append({
        role: 'user',
        content: [
          {
            type: 'text' as const,
            text: 'The content type schema has been updated. Please revise the plan to match the new schema fields and update the draft accordingly.',
          },
        ],
      })
      onSchemaSwitchedSent?.()
    }
  }, [schemaSwitched, historyLoaded, isRunning, threadRuntime, onSchemaSwitchedSent])

  // Custom styling welcome message if thread is empty
  const welcomeText = mode === 'schema'
    ? 'Hello! I am your Hermes AI Content Architect. Describe the additions, modifications, or localized structures you would like to apply to this schema, or use one of the quick actions below.'
    : 'Hello! I am your Hermes AI Content Drafter. Describe the content you want to create or refine, and I will generate it for you step-by-step.'

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest overflow-hidden font-body">

      {/* Chat Panel Header — matches new design */}
      <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-3.5 select-none shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          {/* AI icon badge */}
          <div className="w-8 h-8 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center text-primary flex-shrink-0 relative">
            <span className="material-symbols-outlined text-lg">{activeIcon}</span>
            {isGenerating && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface leading-none font-body">{activeTitle}</p>
            <p className="text-[10px] uppercase tracking-wider text-outline font-label font-semibold mt-0.5">
              {activeSubtitle}
            </p>
          </div>
        </div>

        {/* Status badge — "Thinking..." when generating, otherwise nothing */}
        {isGenerating && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/8 text-primary border border-primary/15 animate-pulse font-label">
            {statusText || 'Thinking...'}
          </span>
        )}
      </div>

      {/* Bubble Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-surface-container-lowest/60 custom-scrollbar">

        {/* Welcome message when thread is empty */}
        {messages.length === 0 && (
          <div className="flex justify-start w-full animate-fade-slide-up">
            <div className="max-w-[95%] w-full rounded-2xl rounded-tl-sm p-4 text-xs leading-relaxed bg-surface-container-lowest border border-outline-variant/15 text-on-surface">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
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
                <div className="max-w-[85%] bg-error-container text-on-error-container rounded-2xl p-4 border border-error/15 flex items-start gap-3">
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
                   className={`max-w-[85%] rounded-2xl p-3 text-base leading-relaxed transition-all duration-300 ${
                     isUser
                       ? 'bg-surface-container-high text-on-surface border border-outline-variant/15 rounded-tr-sm'
                       : 'bg-surface-container-lowest text-on-surface border border-outline-variant/15 rounded-tl-sm w-full max-w-[95%]'
                   }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-label text-[10px] font-bold uppercase tracking-wider ${isUser ? 'text-on-surface-variant' : 'text-primary'}`}>
                      {isUser ? 'You' : 'Hermes Agent'}
                    </span>
                    {msg.createdAt && (
                      <span className="text-[10px] text-outline font-mono">
                        {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <MessageContentFormatter 
                    textContent={textContent} 
                    isUser={isUser} 
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Generation pipeline widget — shown as an AI message bubble while generating */}
        {isGenerating && (
          <div className="flex justify-start w-full animate-fade-slide-up">
            <div className="max-w-[95%] w-full rounded-2xl rounded-tl-sm p-4 bg-surface-container-lowest border border-outline-variant/15 flex flex-col gap-3">
              {/* Active tool indicator */}
              {statusText && (
                <div className="bg-primary/8 border border-primary/15 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary animate-pulse">image_search</span>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide font-label">
                      {statusText}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '100ms' }} />
                    <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '200ms' }} />
                  </div>
                </div>
              )}

              {/* Pipeline steps */}
              <div>
                <p className="text-[10px] uppercase font-bold text-outline tracking-wider font-label mb-2">Generation Pipeline</p>
                <ul className="space-y-2 relative before:absolute before:inset-y-2 before:left-[7px] before:w-px before:bg-outline-variant/30">
                  {/* Step 1 — Handshake */}
                  <li className="flex items-start gap-2 relative z-10">
                    <div className="mt-0.5 bg-surface-container-lowest">
                      <Icon name="check_circle" className="!text-base text-primary" filled />
                    </div>
                    <span className="text-xs text-on-surface-variant font-body font-medium">Connecting & Initializing Handshake</span>
                  </li>

                  {/* Step 2 — Schema & Plan Confirmation */}
                  {(() => {
                    const isConfirmed = (draftData && Object.keys(draftData).length > 0) || (draftingFields && draftingFields.size > 0)
                    const isActive = isGenerating && !isConfirmed
                    return (
                      <li className="flex items-start gap-2 relative z-10">
                        <div className="mt-0.5 bg-surface-container-lowest">
                          {isConfirmed ? (
                            <Icon name="check_circle" className="!text-base text-primary" filled />
                          ) : isActive ? (
                            <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin block" />
                          ) : (
                            <span className="size-4 rounded-full border-2 border-outline-variant/15 block" />
                          )}
                        </div>
                        <span className={`text-xs font-body ${isActive ? 'text-on-surface font-semibold' : isConfirmed ? 'text-on-surface-variant' : 'text-outline'}`}>
                          Schema & Plan Confirmation
                        </span>
                      </li>
                    )
                  })()}

                  {/* Step 3 — Fields Generation Checklist */}
                  {fields.length > 0 ? (
                    fields.map((f: any) => {
                      const isFieldGenerating = draftingFields?.has(f.name)
                      const isFieldCompleted = draftData && draftData[f.name] !== undefined && draftData[f.name] !== ''
                      return (
                        <li key={f.name} className="flex items-start gap-2 relative z-10">
                          <div className="mt-0.5 bg-surface-container-lowest">
                            {isFieldCompleted ? (
                              <Icon name="check_circle" className="!text-base text-primary" filled />
                            ) : isFieldGenerating ? (
                              <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin block" />
                            ) : (
                              <span className="size-4 rounded-full border-2 border-outline-variant/15 block" />
                            )}
                          </div>
                          <span className={`text-xs font-body ${isFieldGenerating ? 'text-on-surface font-semibold' : isFieldCompleted ? 'text-on-surface-variant' : 'text-outline'}`}>
                            {isFieldGenerating ? `Synthesizing ${f.label || f.name}...` : isFieldCompleted ? `Completed ${f.label || f.name}` : `Draft ${f.label || f.name}`}
                          </span>
                        </li>
                      )
                    })
                  ) : (
                    /* Fallback when no schema fields are preloaded (e.g. bootstrap schema mode) */
                    <li className="flex items-start gap-2 relative z-10">
                      <div className="mt-0.5 bg-surface-container-lowest">
                        {isGenerating ? (
                          <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin block" />
                        ) : (
                          <span className="size-4 rounded-full border-2 border-outline-variant/15 block" />
                        )}
                      </div>
                      <span className={`text-xs font-body ${isGenerating ? 'text-on-surface font-semibold' : 'text-outline'}`}>
                        Synthesizing Narrative Prose
                      </span>
                    </li>
                  )}

                  {/* Step 4 — Editorial Integrity */}
                  {(() => {
                    const isConfirmed = (draftData && Object.keys(draftData).length > 0) || (draftingFields && draftingFields.size > 0)
                    const isValidated = !isGenerating && isConfirmed
                    const isValidating = isGenerating && (
                      statusText === 'Self-healing JSON errors...' ||
                      statusText === 'Enforcing schema constraints...' ||
                      (fields.length > 0 && fields.every((f: any) => draftData && draftData[f.name] !== undefined && draftData[f.name] !== ''))
                    )
                    return (
                      <li className="flex items-start gap-2 relative z-10">
                        <div className="mt-0.5 bg-surface-container-lowest">
                          {isValidated ? (
                            <Icon name="check_circle" className="!text-base text-primary" filled />
                          ) : isValidating ? (
                            <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin block" />
                          ) : (
                            <span className="size-4 rounded-full border-2 border-outline-variant/15 block" />
                          )}
                        </div>
                        <span className={`text-xs font-body ${isValidating ? 'text-primary font-medium' : isValidated ? 'text-on-surface-variant' : 'text-outline'}`}>
                          Validating Editorial Integrity
                        </span>
                      </li>
                    )
                  })()}
                </ul>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Co-Creation Micro Actions */}
      <div className="px-4 py-3 bg-surface-container-lowest select-none shrink-0">
        <p className="text-[10px] uppercase font-bold text-outline tracking-wider font-label mb-2">
          Co-Creation Micro Actions
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={isGenerating || isAiPaused}
              onClick={() => threadRuntime.append({ role: 'user', content: [{ type: 'text' as const, text: preset.prompt }] })}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-outline-variant/15 bg-surface-container-lowest hover:bg-surface-container-low text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none font-body"
            >
              <span className="material-symbols-outlined text-xs text-outline">{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-surface-container-lowest shrink-0">
        <div className="relative rounded-xl border border-outline-variant/15 bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
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
            placeholder={isAiPaused ? "AI is paused. Resume AI to interact." : "Instruct the AI to create, refine, or edit..."}
            className="block w-full border-0 bg-transparent py-3 pl-4 pr-12 text-sm text-on-surface placeholder:text-outline/60 focus:ring-0 resize-none max-h-24 font-body leading-relaxed disabled:opacity-60 outline-none"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              type="button"
              disabled={isGenerating || !inputValue.trim() || isAiPaused}
              onClick={() => {
                if (inputValue.trim() && !isGenerating && !isAiPaused) {
                  threadRuntime.append({ role: 'user', content: [{ type: 'text' as const, text: inputValue }] })
                  setInputValue('')
                }
              }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary/90 border-none flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating ? (
                <span className="size-3.5 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              )}
            </button>
          </div>
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
  draftingFields,
  draftData,
  onSchemaGenerated,
  isGenerating: propIsGenerating,
  setIsGenerating: propSetIsGenerating,
  onEvent,
  initialPrompt,
  onInitialPromptSent,
  endpoint = '/api/ai/draft',
  additionalBody = {},
  isAiPaused = false,
  bestMatch,
  alternatives,
  onSelectAlternative,
  schemaSwitched,
  onSchemaSwitchedSent,
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

  // 2. Proactively update adapter config synchronously on every render to ensure child effects always use the latest values
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

  // 3. Initialize assistant-ui runtime using our customized adapter
  const runtime = useLocalRuntime(customAdapter)

  // 4. Fetch persistent chat history from the FastAPI service if sessionId is a valid UUID
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const lastLoadedSessionIdRef = useRef<string | null>(null)
  useEffect(() => {
    const sessionIdStr = sessionId ? String(sessionId) : ''

    if (!shouldLoadHistory(sessionId, lastLoadedSessionIdRef.current, isGenerating)) {
      // Catch initial session transition during active generation and record the transition ref
      const isUuid = sessionIdStr.includes('-')
      if (isUuid && isGenerating && !lastLoadedSessionIdRef.current) {
        lastLoadedSessionIdRef.current = sessionIdStr
      }
      setHistoryLoaded(true)
      return
    }

    async function loadHistory() {
      setHistoryLoaded(false)
      try {
        lastLoadedSessionIdRef.current = sessionIdStr
        const res = await fetch(`/api/content-types/sessions/${sessionIdStr}`)
        if (res.status === 404) {
          runtime.thread.reset([])
          return
        }
        if (!res.ok) throw new Error('Failed to fetch session history')
        const data = await res.json()
        if (data.context && Array.isArray(data.context) && data.context.length > 0) {
          const mappedMessages = mapSessionHistoryToMessages(data.context, sessionIdStr)
          runtime.thread.reset(mappedMessages)
        } else {
          runtime.thread.reset([])
        }
      } catch (err) {
        console.error('Error loading chat history:', err)
      } finally {
        setHistoryLoaded(true)
      }
    }

    loadHistory()
  }, [sessionId, runtime, isGenerating])

  const presets = mode === 'schema' ? SCHEMA_PRESETS : DRAFT_PRESETS
  const activeIcon = mode === 'schema' ? 'psychiatry' : 'smart_toy'
  const activeTitle = mode === 'schema' ? 'Architect Companion' : 'Hermes AI'
  const activeSubtitle = mode === 'schema' ? 'Hermes AI Co-Creation' : 'Content Strategist & Drafter'

  const innerContent = (
    <>
      {/* Persistent Schema Banner — shown whenever a bestMatch is known in draft mode */}
      {bestMatch && mode === 'draft' && (
        <SchemaBanner
          bestMatch={bestMatch}
          alternatives={alternatives}
          onSelectAlternative={onSelectAlternative}
        />
      )}

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
            currentSchema={currentSchema}
            draftingFields={draftingFields}
            draftData={draftData}
            historyLoaded={historyLoaded}
            schemaSwitched={schemaSwitched}
            onSchemaSwitchedSent={onSchemaSwitchedSent}
          />
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </>
  )

  if (isCard) {
    return (
      <Card
        variant="low"
        className="co-creation-chat flex flex-col h-[680px] bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/15 rounded-2xl overflow-hidden font-body"
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
