'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '../atoms/Icon'

export const Nav: React.FC<any> = () => {
  const pathname = usePathname()
  const { user, logOut } = useAuth()

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
        <h1 className="font-headline text-2xl font-black text-primary m-0">Hermes</h1>
        <p className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant mt-1 m-0">CMS</p>
      </div>

      <Link 
        href="/admin/draft/new"
        className="mx-4 mb-6 py-3 px-4 btn-primary-gradient rounded-xl font-label text-sm tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 border-none cursor-pointer no-underline"
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
        <button
          onClick={() => logOut()}
          className="flex w-full items-center gap-3 text-on-surface-variant px-4 py-3 hover:bg-surface-variant rounded-xl font-label text-sm transition-all no-underline bg-transparent border-none cursor-pointer text-left group"
        >
          <Icon name="logout" className="!text-xl transition-transform group-hover:translate-x-0.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {user && (
        <div className="mx-4 mt-2 p-3 bg-surface-container-high/40 rounded-2xl flex items-center justify-between gap-3 border border-outline-variant/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-label text-xs font-bold shrink-0">
              {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="font-label text-xs font-bold text-on-surface truncate leading-none mb-1">
                {user.name || 'User'}
              </span>
              <span className="font-label text-[10px] text-on-surface-variant/70 uppercase tracking-wider font-semibold leading-none truncate">
                {user.role || 'Editor'}
              </span>
            </div>
          </div>
          <button
            onClick={() => logOut()}
            title="Sign Out"
            className="w-8 h-8 rounded-xl hover:bg-surface-variant text-on-surface-variant hover:text-error flex items-center justify-center transition-all border-none bg-transparent cursor-pointer shrink-0"
          >
            <Icon name="logout" className="!text-lg" />
          </button>
        </div>
      )}
    </nav>
  )
}
