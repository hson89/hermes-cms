'use client'

import React, { useState, useEffect } from 'react'

export const FloatingAIBar: React.FC<{
  onRefine: (prompt: string) => void
}> = ({ onRefine }) => {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim().length > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 60
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
      className="fixed z-50 transform -translate-x-1/2 bg-inverse-surface/90 backdrop-blur-xl border border-outline-variant/15 rounded-xl modal-shadow p-1.5 flex flex-col gap-2 min-w-[200px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-center gap-1 pb-1.5 px-1.5">
        <button 
          onClick={() => { onRefine('simplify'); setVisible(false); }}
          className="flex-1 px-2 py-1 text-[10px] font-label text-inverse-on-surface hover:bg-white/10 rounded transition-colors border-none bg-transparent cursor-pointer"
        >
          Simplify
        </button>
        <div className="w-px h-3 bg-white/20"></div>
        <button 
          onClick={() => { onRefine('expand'); setVisible(false); }}
          className="flex-1 px-2 py-1 text-[10px] font-label text-inverse-on-surface hover:bg-white/10 rounded transition-colors border-none bg-transparent cursor-pointer"
        >
          Expand
        </button>
        <div className="w-px h-3 bg-white/20"></div>
        <button 
          onClick={() => { onRefine('change tone'); setVisible(false); }}
          className="flex-1 px-2 py-1 text-[10px] font-label text-inverse-on-surface hover:bg-white/10 rounded transition-colors border-none bg-transparent cursor-pointer"
        >
          Tone
        </button>
      </div>
      <div className="flex items-center gap-2 px-1.5 pb-0.5">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Custom instruction..."
          className="bg-transparent border-none font-body text-[11px] text-inverse-on-surface focus:outline-none w-full placeholder:text-inverse-on-surface/50"
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
          className="w-6 h-6 flex items-center justify-center rounded bg-primary text-on-primary hover:brightness-110 transition-all cursor-pointer border-none"
        >
          <span className="material-symbols-outlined !text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
