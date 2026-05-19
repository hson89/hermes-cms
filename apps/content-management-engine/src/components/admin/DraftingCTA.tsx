"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/atoms/Icon'

export const DraftingCTA: React.FC = () => {
  const router = useRouter()

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 animate-soft-blur-in">
      <div className="flex items-center gap-5">
        <div className="size-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Icon name="auto_awesome" size={32} filled />
        </div>
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface m-0">Drafting with Alexandria AI</h3>
          <p className="font-body text-sm text-on-surface-variant mt-1 max-w-md">
            Instead of manual entry, use our AI architect to research, structure, and generate high-end editorial content based on your active schema.
          </p>
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => router.push('/admin/collections/content-types')}
        className="bg-primary text-on-primary px-6 py-3.5 rounded-xl font-label font-bold text-xs uppercase tracking-widest shadow-md hover:brightness-110 transition-all border-none cursor-pointer flex items-center gap-2"
      >
        Go to Drafting Workspace
        <Icon name="arrow_forward" size={16} />
      </button>
    </div>
  )
}
