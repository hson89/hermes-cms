"use client"

import React from 'react'

export const AISuggestIndicator: React.FC<{
  isNew?: boolean
  isModified?: boolean
}> = ({ isNew, isModified }) => {
  if (!isNew && !isModified) return null

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
      isNew 
        ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-sm' 
        : 'bg-primary-fixed text-on-primary-fixed'
    }`}>
      <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
      {isNew ? 'AI Suggested' : 'AI Refined'}
    </div>
  )
}
