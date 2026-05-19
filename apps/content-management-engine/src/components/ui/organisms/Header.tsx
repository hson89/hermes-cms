'use client'

import React from 'react'
import { Icon } from '../atoms/Icon'
import { useStepNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

export const Header: React.FC = () => {
  const { stepNav } = useStepNav()
  const pathname = usePathname()
  
  // Safely get the current title from stepNav or fallback to Dashboard
  let currentTitle: React.ReactNode = 'Dashboard'
  if (stepNav && stepNav.length > 0) {
    const lastStep = stepNav[stepNav.length - 1]
    if (typeof lastStep.label === 'string') {
      currentTitle = lastStep.label
    } else if (typeof lastStep.label === 'function') {
      currentTitle = 'Dashboard' // Fallback for complex labels
    } else {
      // It might be a Record or StaticLabel, try to find a string
      currentTitle = (lastStep.label as any)?.en || (lastStep.label as any)?.default || 'Dashboard'
    }
  }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[18rem] h-20 z-40 bg-surface-bright/80 backdrop-blur-xl flex justify-between items-center px-8 shadow-[0_1px_4px_rgba(0,0,0,0.01)] transition-colors border-b border-surface-variant/30">
      <div className="flex items-center gap-6">
        <h2 className="font-headline text-xl font-bold text-on-surface m-0">
          {pathname?.includes('/draft/') ? 'The Content Oracle' : currentTitle}
        </h2>
        
        {pathname?.includes('/draft/') && (
          <div className="hidden md:flex gap-4">
            <button className="text-on-surface-variant font-label text-sm hover:bg-surface-variant/50 px-3 py-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer">Drafts</button>
            <button className="text-on-surface-variant font-label text-sm hover:bg-surface-variant/50 px-3 py-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer">Published</button>
            <button className="text-on-surface-variant font-label text-sm hover:bg-surface-variant/50 px-3 py-1.5 rounded-lg transition-colors border-none bg-transparent cursor-pointer">Archived</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer">
          <Icon name="history" className="!text-xl" />
        </button>
        <button className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer">
          <Icon name="settings" className="!text-xl" />
        </button>
        <button className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer mr-2">
          <Icon name="account_circle" className="!text-xl" />
        </button>
        
        {pathname?.includes('/draft/') && (
          <>
            <button className="text-primary font-label text-sm font-medium hover:bg-surface-variant/50 px-4 py-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer">Save</button>
            <button className="bg-primary text-on-primary font-label text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer">Publish</button>
          </>
        )}
      </div>
    </header>
  )
}
