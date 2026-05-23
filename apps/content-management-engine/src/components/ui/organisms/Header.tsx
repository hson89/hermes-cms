'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../atoms/Icon'
import { useStepNav, useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

export const Header: React.FC = () => {
  const { stepNav } = useStepNav()
  const { user, logOut } = useAuth()
  const pathname = usePathname()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileOpen])
  
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
    <header className="fixed top-0 right-0 left-0 lg:left-[18rem] h-20 z-40 bg-surface-bright/80 backdrop-blur-xl flex justify-between items-center px-8 transition-colors border-b border-outline-variant/15">
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
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="text-on-surface-variant hover:bg-surface-variant/50 p-2 rounded-full transition-colors flex items-center justify-center border-none bg-transparent cursor-pointer mr-2"
          >
            <Icon name="account_circle" className="!text-xl" />
          </button>
          
          {isProfileOpen && user && (
            <div className="absolute right-0 mt-2 w-64 bg-surface-bright/80 backdrop-blur-xl border border-outline-variant/15 rounded-2xl p-4 modal-shadow z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-label text-sm font-bold shrink-0">
                    {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label text-sm font-bold text-on-surface truncate leading-tight">
                      {user.name || 'User'}
                    </span>
                    <span className="font-body text-xs text-on-surface-variant/70 truncate mb-1 leading-none">
                      {user.email}
                    </span>
                    <span className="w-fit bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full font-label text-[9px] uppercase font-bold tracking-wide">
                      {user.role || 'Editor'}
                    </span>
                  </div>
                </div>
                
                <div className="h-px bg-outline-variant/15 my-1" />
                
                <button
                  onClick={() => {
                    setIsProfileOpen(false)
                    logOut()
                  }}
                  className="w-full flex items-center justify-center gap-2 btn-primary-gradient py-2.5 px-4 rounded-xl font-label text-sm tracking-wide transition-all border-none cursor-pointer"
                >
                  <Icon name="logout" className="!text-sm" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
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
