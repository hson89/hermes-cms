'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { Icon } from '../atoms/Icon'
import { useClickOutside } from '@/hooks/useClickOutside'

export interface Breadcrumb {
  label: string
  path?: string
}

export interface StatusOption {
  label: string
  value: string
  color?: string
}

export interface TopNavBarProps {
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
  status?: {
    value: string
    onChange: (value: string) => void
    options: StatusOption[]
  }
  userProfile?: {
    name?: string
    image?: string
    role?: string
  }
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  breadcrumbs = [],
  actions,
  status,
  userProfile,
}) => {
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement | null>(null)

  // Accessible click outside listener
  useClickOutside(statusRef, () => {
    setIsStatusOpen(false)
  })

  // Keyboard navigation support for closing menu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsStatusOpen(false)
    }
  }

  const activeStatus = status?.options.find(opt => opt.value === status.value)

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[var(--sidebar-width,18rem)] h-20 z-40 bg-surface-container-lowest/80 backdrop-blur-xl flex justify-between items-center px-8 transition-all duration-300 border-b border-outline-variant/15">
      <div className="flex items-center gap-4">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="font-label text-sm text-on-surface-variant flex items-center gap-2">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Icon name="chevron_right" size={16} className="text-outline/50" />}
                {crumb.path ? (
                  <Link href={crumb.path} className="hover:text-primary transition-colors no-underline text-on-surface-variant">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-on-background font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
            
            {status && (
              <div 
                ref={statusRef}
                onKeyDown={handleKeyDown}
                className="relative ml-2"
              >
                <button 
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all cursor-pointer" 
                  type="button"
                  aria-expanded={isStatusOpen}
                  aria-haspopup="listbox"
                >
                  <span>{activeStatus?.label || 'Status'}</span>
                  <Icon name="expand_more" size={12} className={`transition-transform duration-200 ${isStatusOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isStatusOpen && (
                  <div className="absolute left-0 mt-2 w-32 bg-surface-container-lowest border border-outline-variant/15 rounded-lg shadow-xl z-50 animate-reveal is-revealed">
                    <ul className="py-1 text-[10px] font-bold uppercase tracking-wider list-none p-0 m-0" role="listbox">
                      {status.options.map((opt) => (
                        <li key={opt.value} role="option" aria-selected={opt.value === status.value}>
                          <button
                            onClick={() => {
                              status.onChange(opt.value)
                              setIsStatusOpen(false)
                            }}
                            className={`w-full text-left block px-4 py-2 border-none bg-transparent cursor-pointer transition-colors ${
                              opt.value === status.value 
                               ? 'text-primary bg-primary-container/10' 
                               : 'text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        
        <button className="text-on-surface-variant hover:text-primary transition-colors hover:scale-110 duration-200 border-none bg-transparent cursor-pointer">
          <Icon name="notifications" />
        </button>
        
        <button className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/30 hover:border-primary transition-all duration-200 hover:scale-105 hover:shadow-md border-none cursor-pointer">
          {userProfile?.image ? (
            <img alt={userProfile.name || 'User'} className="w-full h-full object-cover" src={userProfile.image} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-label text-xs font-bold uppercase">
              {userProfile?.name?.slice(0, 2) || 'AD'}
            </div>
          )}
        </button>
      </div>
    </header>
  )
}
