/// <reference types="jest" />
import { CustomSseAdapter } from '../src/services/CustomSseAdapter'

describe('CustomSseAdapter Retry and Graceful Fallback', () => {
  let originalFetch: any
  let setStatusTextCalls: string[] = []

  const mockConfig: any = {
    sessionId: 'session-123',
    endpoint: '/api/ai/draft',
    additionalBody: {},
    isAiPaused: false,
    mode: 'draft',
    onEvent: () => {},
    onSchemaGenerated: () => {},
    onSessionIdChange: () => {},
    setStatusText: (status: string | null) => {
      if (status) setStatusTextCalls.push(status)
    },
  }

  beforeAll(() => {
    originalFetch = global.fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  beforeEach(() => {
    setStatusTextCalls = []
  })

  it('should retry on transient network error and eventually succeed', async () => {
    let callCount = 0
    // Mock fetch: fails twice with TypeError (network error), then succeeds on 3rd attempt
    global.fetch = (async () => {
      callCount++
      if (callCount < 3) {
        throw new TypeError('Failed to fetch')
      }
      
      // Return a successful SSE mock stream response
      const sseStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('event: TEXT_DELTA\ndata: {"delta": "Hello from retried AI!"}\n\n'))
          controller.close()
        }
      })

      return {
        ok: true,
        status: 200,
        body: sseStream,
      } as any
    }) as any

    const adapter = new CustomSseAdapter(mockConfig)
    const abortController = new AbortController()
    const messages = [{ role: 'user', content: [{ type: 'text', text: 'Write a manual car guide' }] }]

    const generator = adapter.run({ messages, abortSignal: abortController.signal })
    const results = []
    for await (const chunk of generator) {
      results.push(chunk)
    }

    expect(callCount).toBe(3) // 1 initial + 2 retries
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].content[0].text).toContain('Hello from retried AI!')
    expect(setStatusTextCalls).toContain('Connection lost. Retrying (1/3)...')
    expect(setStatusTextCalls).toContain('Connection lost. Retrying (2/3)...')
  })

  it('should stop and yield graceful degradation error after max retries are exhausted', async () => {
    let callCount = 0
    // Mock fetch: always fails with connection error
    global.fetch = (async () => {
      callCount++
      throw new TypeError('Network connection reset')
    }) as any

    const adapter = new CustomSseAdapter(mockConfig)
    const abortController = new AbortController()
    const messages = [{ role: 'user', content: [{ type: 'text', text: 'Write a manual car guide' }] }]

    const generator = adapter.run({ messages, abortSignal: abortController.signal })
    const results = []
    for await (const chunk of generator) {
      results.push(chunk)
    }

    expect(callCount).toBe(4) // 1 initial + 3 retries = 4 attempts total
    expect(results.length).toBe(1)
    expect(results[0].content[0].text).toContain('⚠️ Connection Interrupted')
    expect(results[0].content[0].text).toContain('We are having trouble communicating with the **Hermes AI Content Authoring Service**.')
    expect(results[0].content[0].text).toContain('3 connection retries')
    expect(setStatusTextCalls).toContain('Connection lost. Retrying (1/3)...')
    expect(setStatusTextCalls).toContain('Connection lost. Retrying (2/3)...')
    expect(setStatusTextCalls).toContain('Connection lost. Retrying (3/3)...')
  })
})
