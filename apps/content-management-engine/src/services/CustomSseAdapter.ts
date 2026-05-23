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
    const MAX_RETRIES = 3
    const BASE_DELAY = typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 10 : 1500 // ms

    const fetchWithRetry = async (
      url: string,
      options: RequestInit,
      retriesLeft = MAX_RETRIES
    ): Promise<Response> => {
      try {
        const res = await fetch(url, options)
        // Only retry on network errors or server-side 5xx errors
        if (!res.ok && res.status >= 500 && retriesLeft > 0) {
          throw new Error(`Server returned status ${res.status}`)
        }
        return res
      } catch (err: any) {
        if (retriesLeft <= 0 || abortSignal.aborted || err.name === 'AbortError') {
          throw err
        }
        const attempt = MAX_RETRIES - retriesLeft + 1
        const delay = BASE_DELAY * Math.pow(2, attempt - 1)
        this.config.setStatusText(`Connection lost. Retrying (${attempt}/${MAX_RETRIES})...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return fetchWithRetry(url, options, retriesLeft - 1)
      }
    }

    let explanationAccumulator = ''

    try {
      // 1. In schema mode, initialize session first if not yet established
      if (this.config.mode === 'schema' && !activeSessionId) {
        this.config.setStatusText('Initializing architect session...')
        const initRes = await fetchWithRetry('/api/content-types/generate-schema', {
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
      }

      // 2. Perform target streaming request
      let response: Response
      if (this.config.mode === 'schema') {
        this.config.setStatusText('Generating content layout...')
        response = await fetchWithRetry(`/api/content-types/sessions/${activeSessionId}/message`, {
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
        response = await fetchWithRetry(this.config.endpoint, {
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
                      text: explanationAccumulator,
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
      }
    } catch (err: any) {
      this.config.setStatusText(null)

      if (abortSignal.aborted || err.name === 'AbortError') {
        throw err
      }

      console.error('[CustomSseAdapter Error]', err)

      // Graceful error handling
      const isNetworkError = err instanceof TypeError || err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch')
      const errorTitle = isNetworkError ? '⚠️ Connection Interrupted' : '⚠️ Generation Encountered an Issue'
      const errorReason = isNetworkError 
        ? 'We are having trouble communicating with the **Hermes AI Content Authoring Service**.'
        : `The system encountered an error: **${err.message || 'Unknown error'}**.`

      const prefix = explanationAccumulator ? `${explanationAccumulator}\n\n---\n\n` : ''
      const gracefulMessage = `${prefix}### ${errorTitle}\n\n` +
        `${errorReason}\n\n` +
        `* **Attempted**: ${MAX_RETRIES} connection retries without success.\n` +
        `* **Status**: Terminated gracefully to prevent UI lockup.\n\n` +
        `**What you can do:**\n` +
        `1. **Check your connection**: Ensure your network is active and stable.\n` +
        `2. **Verify the service**: The AI microservice might be restarting or busy.\n` +
        `3. **Draft safely saved**: Don't worry, your current draft progress is safely saved. You can try sending your message again once the connection is restored.`

      yield {
        content: [
          {
            type: 'text' as const,
            text: gracefulMessage,
          },
        ],
      }
    } finally {
      this.config.setStatusText(null)
    }
  }
}
