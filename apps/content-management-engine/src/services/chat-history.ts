export interface HistoryMessage {
  role: string
  content: string
  timestamp?: string
}

export interface AssistantUiMessage {
  id: string
  parentId: string | null
  role: 'system' | 'user' | 'assistant'
  content: Array<{ type: 'text'; text: string }>
}

/**
 * Maps a flat array of history messages retrieved from the backend AI service
 * into a sequence of linked assistant-ui messages, including proper parent-child relations.
 * 
 * Filters out system messages and builds a sequential message chain where each message
 * points to the immediately preceding message as its parent.
 */
export function mapSessionHistoryToMessages(
  context: HistoryMessage[],
  sessionIdStr: string
): AssistantUiMessage[] {
  if (!context || !Array.isArray(context)) return []

  const filteredContext = context.filter((msg) => msg.role !== 'system')

  return filteredContext.map((msg, index) => {
    const msgId = `${sessionIdStr}-msg-${msg.timestamp || index}`
    const parentId = index > 0 
      ? `${sessionIdStr}-msg-${filteredContext[index - 1].timestamp || (index - 1)}` 
      : null

    const resolvedRole = (msg.role === 'user' || msg.role === 'system') 
      ? msg.role 
      : 'assistant'

    return {
      id: msgId,
      parentId,
      role: resolvedRole,
      content: [{ type: 'text' as const, text: msg.content }],
    }
  })
}

/**
 * Decision logic for whether we should reload and reset the chat history.
 * Prevents fetching history and wiping the thread state during active streaming.
 */
export function shouldLoadHistory(
  sessionId: string | null,
  lastLoadedSessionId: string | null,
  isGenerating: boolean
): boolean {
  const sessionIdStr = sessionId ? String(sessionId) : ''
  const isUuid = sessionIdStr.includes('-')
  
  if (!isUuid) return false
  if (sessionIdStr === lastLoadedSessionId) return false
  
  // If we are actively generating and this is the initial transition from null/empty,
  // we do not load history (to protect the active streaming state).
  if (isGenerating && !lastLoadedSessionId) {
    return false
  }
  
  return true
}

