"use client"

import React, { useState, useEffect } from 'react'

export const FloatingAIBar: React.FC<{
  onRefine: (prompt: str) => void
}> = ({ onRefine }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setPosition({
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY - 60,
        })
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    document.addEventListener('mouseup', handleSelection)
    return () => document.removeEventListener('mouseup', handleSelection)
  }, [])

  if (!visible) return null

  return (
    <div 
      className="fixed z-50 transform -translate-x-1/2 bg-surface-bright/80 backdrop-blur-xl border border-outline-variant/15 rounded-full shadow-2xl p-1.5 flex items-center gap-2"
      style={{ left: position.x, top: position.y }}
    >
      <input 
        type="text" 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Refine selection..."
        className="bg-transparent border-none font-body text-xs pl-4 pr-2 focus:outline-none w-48"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onRefine(prompt)
            setPrompt('')
            setVisible(false)
          }
        }}
      />
      <button 
        onClick={() => { onRefine(prompt); setPrompt(''); setVisible(false); }}
        className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center hover:brightness-110 transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm">auto_awesome</span>
      </button>
    </div>
  )
}
