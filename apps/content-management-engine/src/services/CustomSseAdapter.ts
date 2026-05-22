import { ChatModelAdapter } from '@assistant-ui/react'

export interface CustomSseAdapterConfig {
  sessionId: string | null
  endpoint: string
  additionalBody?: any
  isAiPaused?: boolean
  mode?: 'schema' | 'draft'
  onEvent?: (event: any) => void
  onSchemaGenerated?: (schema: any) => void
  onSessionIdChange?: (id: string) => void
  currentSchema?: any
  setStatusText: (status: string | null) => void
}

export class CustomSseAdapter implements ChatModelAdapter {
  private config: CustomSseAdapterConfig

  constructor(config: CustomSseAdapterConfig) {
    this.config = config
  }

  // Allow dynamic updates to configuration options as standard props change
  public updateConfig(newConfig: CustomSseAdapterConfig) {
    this.config = newConfig
  }

  async *run({ messages, abortSignal }: { messages: readonly any[]; abortSignal: AbortSignal }) {
    const lastUserMessage = messages[messages.length - 1]
    const promptToSend = lastUserMessage?.content?.[0]?.text || ''

    if (!promptToSend.trim()) return

    let activeSessionId = this.config.sessionId

    // 1. In schema mode, initialize session first if not yet established
    if (this.config.mode === 'schema' && !activeSessionId) {
      this.config.setStatusText('Initializing architect session...')
      try {
        const initRes = await fetch('/api/content-types/generate-schema', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortSignal,
          body: JSON.stringify({
            prompt: promptToSend,
            currentSchema: this.config.currentSchema || undefined,
          }),
        })

        let initResult: any
        const initText = await initRes.text()
        try {
          initResult = JSON.parse(initText)
        } catch (_) {
          if (!initRes.ok) throw new Error(initText || 'Handshake failed.')
          throw new Error('Failed to parse response from generation service.')
        }

        if (!initRes.ok) {
          throw new Error(initResult?.error || initResult?.message || 'Handshake with generation service failed.')
        }

        activeSessionId = initResult.sessionId
        if (activeSessionId && this.config.onSessionIdChange) {
          this.config.onSessionIdChange(activeSessionId)
        } else {
          throw new Error('Failed to resolve generation session ID.')
        }
      } catch (err: any) {
        this.config.setStatusText(null)
        throw err
      }
    }

    // 2. Perform target streaming request
    let response: Response
    try {
      if (this.config.mode === 'schema') {
        this.config.setStatusText('Generating content layout...')
        response = await fetch(`/api/content-types/sessions/${activeSessionId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortSignal,
          body: JSON.stringify({
            prompt: promptToSend,
            currentSchema: this.config.currentSchema || undefined,
          }),
        })
      } else {
        this.config.setStatusText('Thinking...')
        response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortSignal,
          body: JSON.stringify({
            prompt: promptToSend,
            session_id: activeSessionId,
            ...this.config.additionalBody,
          }),
        })
      }
    } catch (err: any) {
      this.config.setStatusText(null)
      throw err
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
      this.config.setStatusText(null)
      throw new Error(errorMessage)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      this.config.setStatusText(null)
      throw new Error('Readable stream not supported in response.')
    }

    const decoder = new TextDecoder('utf-8')
    let streamBuffer = ''
    let explanationAccumulator = ''

    try {
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
            if (eventType === 'ERROR') {
              const data = JSON.parse(dataStr)
              throw new Error(data.detail || data.message || JSON.stringify(data))
            }

            if (eventType === 'TEXT_DELTA') {
              let delta: any = dataStr
              try {
                delta = JSON.parse(dataStr)
              } catch (_) {
                // Parse failed, keep it as raw string
              }

              const textSegment = typeof delta === 'string' ? delta : (delta.delta || '')
              explanationAccumulator += textSegment
              
              // Yield the text delta back to assistant-ui thread for real-time streaming bubbles
              yield {
                content: [
                  {
                    type: 'text' as const,
                    text: textSegment,
                  },
                ],
              }

              // Propagate field-level updates up to CMS/Editor handlers
              if (typeof delta === 'object' && delta.field) {
                this.config.onEvent?.({ event: eventType, data: delta })
              }
            } else if (eventType === 'STATE_DELTA') {
              const schemaData = JSON.parse(dataStr)
              if (schemaData && schemaData.fields && this.config.onSchemaGenerated) {
                this.config.onSchemaGenerated(schemaData)
              }
            } else if (eventType === 'STATUS_UPDATE') {
              if (dataStr === 'completed') {
                this.config.setStatusText(null)
              } else if (dataStr === 'validating') {
                this.config.setStatusText('Enforcing schema constraints...')
              } else if (dataStr === 'self-correcting') {
                this.config.setStatusText('Self-healing JSON errors...')
              } else if (dataStr === 'generating') {
                this.config.setStatusText('Thinking...')
              }
            } else {
              // Propagate general events (FIELD_START, FIELD_COMPLETE, IMAGE_READY, etc.)
              let parsed = dataStr
              try {
                parsed = JSON.parse(dataStr)
              } catch (_) {}
              this.config.onEvent?.({ event: eventType, data: parsed })
            }
          }

          boundaryIndex = streamBuffer.indexOf(eventBoundary)
        }
      }
    } finally {
      reader.releaseLock()
      this.config.setStatusText(null)
    }
  }
}
