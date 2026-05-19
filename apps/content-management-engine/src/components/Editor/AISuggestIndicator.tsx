"use client"

import React from 'react'

export const AISuggestIndicator: React.FC<{
  isNew?: boolean
  isModified?: boolean
}> = ({ isNew, isModified }) => {
  if (!isNew && !isModified) return null

  return (
    <button className="flex items-center gap-1 text-[10px] bg-primary-container/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary-container/20 transition-all font-label font-bold border-none cursor-pointer">
      <span className="material-symbols-outlined !text-xs">auto_fix_high</span>
      {isNew ? 'AI SUGGESTS' : 'AI REFINED'}
    </button>
  )
}
