'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '../ui/atoms/Icon'

export const Nav: React.FC<any> = () => {
  const pathname = usePathname()
  const { user } = useAuth()

  const navLinks = [
    { label: 'Dashboard', icon: 'grid_view', path: '/admin' },
    { label: 'Tenants', icon: 'corporate_fare', path: '/admin/collections/tenants' },
    { label: 'Users', icon: 'group', path: '/admin/collections/users' },
    { label: 'Content Types', icon: 'layers', path: '/admin/collections/content-types' },
    { label: 'API Keys', icon: 'vpn_key', path: '/admin/collections/api-keys' },
    { label: 'Hosted Sites', icon: 'web', path: '/admin/collections/hosted-sites' },
  ]

  return (
    <nav className="alexandria-nav fixed left-0 top-0 h-full w-72 flex flex-col bg-on-primary-fixed dark:bg-on-primary-fixed z-50 overflow-y-auto overflow-x-hidden shadow-2xl">
      <div className="flex flex-col h-full p-6 justify-between">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-10 pl-2">
            <span className="material-symbols-outlined text-primary-fixed-dim text-3xl">psychiatry</span>
            <div>
              <h1 className="font-display text-xl font-bold text-surface-bright tracking-tighter uppercase m-0 leading-none">HERMES AI</h1>
            </div>
          </div>

          {/* Main Navigation */}
          <ul className="space-y-2 font-body text-label-sm tracking-wide list-none p-0 m-0">
            {navLinks.map((link) => {
              const isActive = pathname === link.path || (link.path !== '/admin' && pathname.startsWith(link.path))
              
              return (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 no-underline group ${
                      isActive 
                        ? 'bg-primary-container text-on-primary-container shadow-lg shadow-primary/10' 
                        : 'text-primary-fixed-dim hover:text-surface-bright hover:bg-on-primary-fixed-variant'
                    }`}
                  >
                    <Icon 
                      name={link.icon} 
                      filled={isActive}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Footer Navigation */}
        <div className="space-y-2 font-body text-label-sm tracking-wide">
          <div className="pt-6 mt-6">
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 text-primary-fixed-dim hover:text-surface-bright hover:bg-on-primary-fixed-variant rounded-xl transition-all duration-200 no-underline group"
            >
              <Icon name="settings" className="group-hover:rotate-45 transition-transform duration-500" />
              <span className="font-medium">Settings</span>
            </Link>
          </div>

          <div className="mt-4 pt-4 bg-on-primary-fixed-variant/20 rounded-2xl">
            <div className="flex items-center gap-3 px-4 py-3 text-primary-fixed-dim rounded-xl group/profile transition-all duration-200">
              <div className="relative">
                <img 
                  src={`https://www.gravatar.com/avatar/${user?.email || 'admin'}?d=mp&s=100`}
                  alt={user?.email || 'User'} 
                  className="w-8 h-8 rounded-full border border-primary-fixed-dim/50 object-cover"
                />
                <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate text-surface-bright leading-tight">
                  {(user as any)?.name || user?.email?.split('@')[0] || 'Admin User'}
                </span>
                <Link href="/admin/logout" className="text-[10px] text-primary-fixed-dim/60 hover:text-error transition-colors no-underline uppercase tracking-widest font-bold mt-1">Sign Out</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
