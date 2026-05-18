'use client'

import React, { useState } from 'react'

/**
 * T024 - Integrate side-by-side copilot UI with traditional editor
 */
export const CopilotSidebar: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleEdit = async () => {
    if (!prompt) return

    setLoading(true)
    try {
      const res = await fetch('/api/ai/copilot/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentItemId: 'current-item', // In a real app, grab this from useDocumentInfo()
          sectionId: 'current-section', // In a real app, grab from lexical selection
          prompt,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to run copilot')
      }

      const data = await res.json()
      setResult(data.content)
    } catch (e) {
      console.error(e)
      setResult('Error executing copilot edit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '20px' }}>
      <h3>AI Copilot</h3>
      <p>Select a section and ask AI to edit it.</p>
      
      <textarea 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="E.g., Make this paragraph more formal..."
        style={{ width: '100%', minHeight: '80px', marginBottom: '10px' }}
      />
      
      <button 
        onClick={handleEdit} 
        disabled={loading || !prompt}
        style={{ padding: '8px 16px', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Thinking...' : 'Edit Section'}
      </button>

      {result && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          <strong>Suggested Edit:</strong>
          <p>{result}</p>
        </div>
      )}
    </div>
  )
}
