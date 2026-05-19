"use client"

import React from 'react'

export const RecoveryDialog: React.FC<{
  onResume: () => void
  onDiscard: () => void
}> = ({ onResume, onDiscard }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-xl p-6 animate-soft-blur-in">
      <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden border border-outline-variant/10">
        <div className="p-10 space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-container text-primary flex items-center justify-center">
            <span className="material-symbols-outlined !text-3xl">history_toggle_off</span>
          </div>
          <div className="space-y-3">
            <h3 className="font-headline text-3xl font-bold text-on-surface m-0 leading-tight">Resume your work?</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed">
              We saved an unfinished session from your last visit. You can continue refining that content or discard it to start fresh.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <button 
              onClick={onResume}
              className="w-full bg-primary text-on-primary py-4 rounded-2xl font-label font-bold text-sm tracking-widest uppercase shadow-lg shadow-primary/20 hover:brightness-110 transition-all cursor-pointer border-none"
            >
              Resume Session
            </button>
            <button 
              onClick={onDiscard}
              className="w-full bg-surface-container text-on-surface-variant py-4 rounded-2xl font-label font-bold text-sm tracking-widest uppercase hover:text-error transition-all cursor-pointer border-none"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
