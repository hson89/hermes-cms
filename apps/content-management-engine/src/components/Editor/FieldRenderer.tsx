"use client"

import React from 'react'

export const FieldRenderer: React.FC<{
  field: any
  value: any
  onChange: (val: any) => void
}> = ({ field, value, onChange }) => {
  const commonClasses = "w-full bg-white border border-outline-variant/15 rounded-lg p-4 font-body text-sm focus:outline-none focus:border-primary/50 transition-colors"

  switch (field.type) {
    case 'text':
      return (
        <input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        />
      )
    case 'textarea':
      return (
        <textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className={`${commonClasses} min-h-[120px] resize-y`}
        />
      )
    case 'richText':
      // Simplified rich text for drafting (Markdown preview or Lexical stub)
      return (
        <div className="space-y-2">
          <div className={`${commonClasses} min-h-[200px] bg-surface-container-low font-code text-xs overflow-auto`}>
            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          </div>
          <p className="font-label text-[10px] text-on-surface-variant/60">
            Rich Text Editor will be initialized after promotion. Currently showing raw AI output.
          </p>
        </div>
      )
    case 'upload':
      return (
        <div className="space-y-4">
          <div className={`${commonClasses} flex flex-col items-center justify-center border-dashed border-2 min-h-[200px] bg-surface-container-low`}>
            {value ? (
              <div className="relative group w-full h-full flex items-center justify-center">
                <img 
                  src={typeof value === 'string' ? value : (value.url || '')} 
                  alt="AI Generated" 
                  className="max-h-[300px] rounded-lg shadow-md"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <button className="bg-white text-on-surface px-3 py-1.5 rounded-md font-label text-xs font-bold shadow-sm">
                    Replace with AI
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/20">image</span>
                <button 
                  onClick={() => onChange({ url: 'https://via.placeholder.com/1024x1024?text=AI+Generating...' })}
                  className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-label font-bold text-xs tracking-wide shadow-sm hover:bg-primary hover:text-on-primary transition-all"
                >
                  Generate with AI
                </button>
              </div>
            )}
          </div>
        </div>
      )
    default:
      return (
        <div className={`${commonClasses} bg-surface-container-low italic text-on-surface-variant/40`}>
          Field type "{field.type}" renderer not implemented yet.
        </div>
      )
  }
}
