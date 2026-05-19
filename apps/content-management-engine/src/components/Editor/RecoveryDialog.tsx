"use client"

import React from 'react'

export const RecoveryDialog: React.FC<{
  onResume: () => void
  onDiscard: () => void
}> = ({ onResume, onDiscard }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-md p-6">
      <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/15">
        <div className="p-8 space-y-6">
          <div className="w-12 h-12 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined">history</span>
          </div>
          <div className="space-y-2">
            <h3 className="font-headline text-2xl font-bold text-on-surface m-0">Recover your previous draft?</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              We found an unfinished session from your last visit. Would you like to resume where you left off or start a completely new draft?
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={onResume}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-label font-bold text-sm tracking-wide shadow-md hover:brightness-110 transition-all cursor-pointer"
            >
              Resume Previous Session
            </button>
            <button 
              onClick={onDiscard}
              className="w-full bg-surface-container-highest text-on-surface-variant py-3 rounded-xl font-label font-bold text-sm tracking-wide hover:text-error transition-all cursor-pointer border-none"
            >
              Discard and Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
