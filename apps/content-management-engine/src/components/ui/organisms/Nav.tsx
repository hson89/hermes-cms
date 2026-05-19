'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '../atoms/Icon'

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
    <nav className="alexandria-nav fixed left-0 top-0 h-screen w-72 lg:w-[18rem] z-[1000] bg-surface-container flex flex-col py-6 gap-y-1 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
      <div className="px-6 pb-8">
        <h1 className="font-headline text-2xl font-black text-primary m-0">Alexandria</h1>
        <p className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant mt-1 m-0">AI Headless CMS</p>
      </div>

      <Link 
        href="/admin/draft/new"
        className="mx-4 mb-6 py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-label text-sm tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 border-none cursor-pointer no-underline"
      >
        <span className="material-symbols-outlined !text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        New Entry
      </Link>

      <div className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
        {navLinks.map((link) => {
          const isActive = pathname === link.path || (link.path !== '/admin' && pathname.startsWith(link.path))
          
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 no-underline group ${
                isActive 
                  ? 'bg-primary-container text-on-primary-container shadow-sm' 
                  : 'text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <Icon 
                name={link.icon} 
                filled={isActive}
                className="!text-xl"
              />
              <span className="font-label text-sm font-medium">{link.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="px-2 pb-4 border-t border-outline-variant/10 pt-4 mt-auto">
        <Link
          href="/admin/help"
          className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant rounded-xl font-label text-sm transition-all no-underline"
        >
          <Icon name="help_outline" className="!text-xl" />
          <span>Help</span>
        </Link>
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant rounded-xl font-label text-sm transition-all no-underline"
        >
          <Icon name="settings" className="!text-xl" />
          <span>Settings</span>
        </Link>
      </div>
    </nav>
  )
}
