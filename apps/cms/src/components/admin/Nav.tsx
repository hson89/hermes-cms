'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
export const Nav: React.FC<any> = () => {
  const pathname = usePathname()

  const navLinks = [
    { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
    { label: 'Tenants', icon: 'corporate_fare', path: '/admin/collections/tenants' },
    { label: 'Content Types', icon: 'account_tree', path: '/admin/collections/content-types' },
    { label: 'Content', icon: 'edit_square', path: '/admin/collections/content-items' },
    { label: 'Hosted Sites', icon: 'public', path: '/admin/collections/hosted-sites' },
    { label: 'API Keys', icon: 'vpn_key', path: '/admin/collections/api-keys' },
    { label: 'Users', icon: 'person', path: '/admin/collections/users' },
  ]

  return (
    <nav className="alexandria-nav fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-md border-r border-black/5 z-50 flex flex-col">
      <div className="p-8 border-b border-black/5">
        <h1 className="text-2xl font-bold font-serif tracking-tight text-[#094cb2]">Hermes AI</h1>
        <p className="text-[10px] uppercase tracking-widest text-black/40 font-sans mt-1 font-semibold">Admin Panel</p>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.path || (link.path !== '/admin' && pathname.startsWith(link.path))
          
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-[#094cb2]/5 text-[#094cb2]' 
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:scale-110 ${
                isActive ? 'fill-1' : ''
              }`}>
                {link.icon}
              </span>
              <span className="font-sans text-sm font-medium">{link.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#094cb2]" />
              )}
            </Link>
          )
        })}
      </div>

      <div className="p-6 border-t border-black/5 space-y-4">
        <div className="flex items-center space-x-3 px-4 py-2 opacity-60">
          <div className="w-8 h-8 rounded-full bg-[#6d5e00]/10 flex items-center justify-center text-[#6d5e00]">
            <span className="material-symbols-outlined text-[18px]">account_circle</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate">Super Admin</span>
            <span className="text-[10px] text-black/40 truncate">System Root</span>
          </div>
        </div>
        
        <Link 
          href="/admin/logout"
          className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500/60 hover:bg-red-500/5 hover:text-red-500 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-sans text-sm font-medium">Sign Out</span>
        </Link>
      </div>
    </nav>
  )
}
