/// <reference types="jest" />
import { mapSessionHistoryToMessages, shouldLoadHistory, isSchemaReuseMessage, HistoryMessage } from '../src/services/chat-history'

describe('mapSessionHistoryToMessages', () => {
  const sessionId = 'test-session-123'

  it('should return an empty array if context is empty, null, or undefined', () => {
    expect(mapSessionHistoryToMessages([], sessionId)).toEqual([])
    expect(mapSessionHistoryToMessages(null as any, sessionId)).toEqual([])
    expect(mapSessionHistoryToMessages(undefined as any, sessionId)).toEqual([])
  })

  it('should map a single user message and set parentId to null', () => {
    const context: HistoryMessage[] = [
      {
        role: 'user',
        content: 'Hello, Hermes!',
        timestamp: '2026-05-23T04:00:00Z',
      },
    ]

    const result = mapSessionHistoryToMessages(context, sessionId)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'test-session-123-msg-2026-05-23T04:00:00Z',
      parentId: null,
      role: 'user',
      content: [{ type: 'text', text: 'Hello, Hermes!' }],
    })
  })

  it('should filter out system messages from the mapped array', () => {
    const context: HistoryMessage[] = [
      {
        role: 'system',
        content: 'System initialization instruction',
        timestamp: '2026-05-23T03:59:00Z',
      },
      {
        role: 'user',
        content: 'Hello, Hermes!',
        timestamp: '2026-05-23T04:00:00Z',
      },
    ]

    const result = mapSessionHistoryToMessages(context, sessionId)

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('user')
    expect(result[0].parentId).toBeNull()
  })

  it('should establish correct linear parent-child relationships for multiple messages', () => {
    const context: HistoryMessage[] = [
      {
        role: 'user',
        content: 'Question 1',
        timestamp: 'ts-1',
      },
      {
        role: 'assistant',
        content: 'Answer 1',
        timestamp: 'ts-2',
      },
      {
        role: 'user',
        content: 'Question 2',
        timestamp: 'ts-3',
      },
    ]

    const result = mapSessionHistoryToMessages(context, sessionId)

    expect(result).toHaveLength(3)

    // Message 1 (index 0)
    expect(result[0].id).toBe('test-session-123-msg-ts-1')
    expect(result[0].parentId).toBeNull()
    expect(result[0].role).toBe('user')

    // Message 2 (index 1) - should point to message 1 as parent
    expect(result[1].id).toBe('test-session-123-msg-ts-2')
    expect(result[1].parentId).toBe('test-session-123-msg-ts-1')
    expect(result[1].role).toBe('assistant')

    // Message 3 (index 2) - should point to message 2 as parent
    expect(result[2].id).toBe('test-session-123-msg-ts-3')
    expect(result[2].parentId).toBe('test-session-123-msg-ts-2')
    expect(result[2].role).toBe('user')
  })

  it('should fallback to using the index if timestamps are missing', () => {
    const context: HistoryMessage[] = [
      {
        role: 'user',
        content: 'First query',
      },
      {
        role: 'assistant',
        content: 'First response',
      },
    ]

    const result = mapSessionHistoryToMessages(context, sessionId)

    expect(result).toHaveLength(2)
    
    // First message ID and parentId check
    expect(result[0].id).toBe('test-session-123-msg-0')
    expect(result[0].parentId).toBeNull()

    // Second message ID and parentId check
    expect(result[1].id).toBe('test-session-123-msg-1')
    expect(result[1].parentId).toBe('test-session-123-msg-0')
  })

  it('should fallback to assistant role if backend returns an unexpected/non-supported role', () => {
    const context: HistoryMessage[] = [
      {
        role: 'unknown-bot-role',
        content: 'Special bot message',
        timestamp: 'ts-bot',
      },
    ]

    const result = mapSessionHistoryToMessages(context, sessionId)

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('assistant') // Coerced to assistant
  })
})

describe('shouldLoadHistory', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'

  it('should return false if sessionId is not a valid UUID', () => {
    expect(shouldLoadHistory(null, null, false)).toBe(false)
    expect(shouldLoadHistory('', null, false)).toBe(false)
    expect(shouldLoadHistory('not_a_uuid', null, false)).toBe(false)
  })

  it('should return false if sessionId is already equal to lastLoadedSessionId', () => {
    expect(shouldLoadHistory(validUuid, validUuid, false)).toBe(false)
  })

  it('should return false if actively generating and lastLoadedSessionId is null', () => {
    expect(shouldLoadHistory(validUuid, null, true)).toBe(false)
  })

  it('should return true if not generating and transitioning from null to a valid UUID', () => {
    expect(shouldLoadHistory(validUuid, null, false)).toBe(true)
  })

  it('should return true if transitioning from one valid UUID to another', () => {
    const anotherUuid = '223e4567-e89b-12d3-a456-426614174000'
    expect(shouldLoadHistory(anotherUuid, validUuid, false)).toBe(true)
    expect(shouldLoadHistory(anotherUuid, validUuid, true)).toBe(true)
  })
})

describe('isSchemaReuseMessage', () => {
  it('should return true for assistant messages containing reuse notification patterns', () => {
    expect(isSchemaReuseMessage('assistant', 'Reusing existing content type: Blogs')).toBe(true)
    expect(isSchemaReuseMessage('assistant', 'Reused existing content type: Posts')).toBe(true)
  })

  it('should return false for user messages even if they contain the pattern', () => {
    expect(isSchemaReuseMessage('user', 'Reusing existing content type: Blogs')).toBe(false)
  })

  it('should return false for assistant messages that do not contain the reuse pattern', () => {
    expect(isSchemaReuseMessage('assistant', 'Creating a brand new schema called Blogs')).toBe(false)
  })
})


