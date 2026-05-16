"use client"

import React from 'react'
import { Icon } from '../ui/atoms/Icon'
import { useStepNav } from '@payloadcms/ui'

export const Header: React.FC = () => {
  const { stepNav } = useStepNav()
  
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
    <header className="w-full h-20 sticky top-0 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-10 max-w-full">
      <div className="flex items-center">
        <h2 className="font-headline font-bold text-on-surface text-2xl tracking-tight m-0">
          {currentTitle}
        </h2>
      </div>
      <div className="flex items-center gap-6">
        {/* Trailing Actions */}
        <button className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus-within:ring-2 focus-within:ring-primary/20 rounded-full p-2 bg-transparent border-none cursor-pointer flex items-center justify-center">
          <Icon name="notifications" />
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none focus-within:ring-2 focus-within:ring-primary/20 rounded-full p-2 bg-transparent border-none cursor-pointer flex items-center justify-center">
          <Icon name="help_outline" />
        </button>
      </div>
    </header>
  )
}
