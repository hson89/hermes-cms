'use client'

import React from 'react'

export const RecoveryDialog: React.FC<{
  onResume: () => void
  onDiscard: () => void
}> = ({ onResume, onDiscard }) => {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-md w-full mx-4 border border-outline-variant/15 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-primary-container/20 text-primary flex items-center justify-center mb-6 mx-auto">
          <span className="material-symbols-outlined !text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
        </div>
        
        <h2 className="font-headline text-2xl font-bold text-on-surface text-center mb-2">Unfinished Draft Found</h2>
        <p className="font-body text-on-surface-variant text-center mb-8">
          We found a draft from your previous session. Would you like to continue where you left off or start fresh?
        </p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onResume}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-label font-bold tracking-wide transition-all border-none cursor-pointer"
          >
            Resume Session
          </button>
          <button 
            onClick={onDiscard}
            className="w-full bg-surface-container-high text-on-surface py-3 rounded-xl font-label font-bold tracking-wide hover:bg-surface-variant transition-all border-none cursor-pointer"
          >
            Discard and Start Fresh
          </button>
        </div>
      </div>
    </div>
  )
}
