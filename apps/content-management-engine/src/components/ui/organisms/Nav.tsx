'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'
import { Icon } from '../atoms/Icon'
import { BRANDING } from '@/constants/branding'
import { MAIN_NAV_LINKS, TEMPLATE_SUB_LINKS, CONTENT_SUB_LINKS, BOTTOM_NAV_LINKS } from '@/constants/navigation'
import { getSidebarCta } from '@/utils/navigation'

export const Nav: React.FC<any> = () => {
  const pathname = usePathname()
  const cta = getSidebarCta(pathname)
  const { user, logOut } = useAuth()
  const [isContentOpen, setIsContentOpen] = useState(true)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true)

  // Persistent collapse state initialized safely for SSR
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Hydrate state from localStorage safely after initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed') === 'true'
      setIsCollapsed(stored)
    }
  }, [])

  // Synchronize CSS custom property across the app
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '5rem' : '18rem')
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar-collapsed', String(next))
      }
      return next
    })
  }

  // Dynamic role-based filtering logic
  const checkRoleAccess = (item: any) => {
    if (!item.roleRequirement) return true
    if (!user) return false
    
    const userRole = user.role || 'editor'
    if (userRole === 'super-admin') return true
    if (item.roleRequirement === 'super-admin') return false
    
    if (userRole === 'admin') return true
    if (item.roleRequirement === 'admin') return false
    
    return userRole === item.roleRequirement
  }

  const visibleNavLinks = MAIN_NAV_LINKS.filter(checkRoleAccess)
  const visibleContentSubLinks = CONTENT_SUB_LINKS.filter(checkRoleAccess)
  const visibleTemplateSubLinks = TEMPLATE_SUB_LINKS.filter(checkRoleAccess)
  const visibleBottomLinks = BOTTOM_NAV_LINKS.filter(checkRoleAccess)

  return (
    <nav className="alexandria-nav bg-surface-container-lowest fixed left-0 top-0 h-full flex flex-col py-8 px-4 gap-y-6 z-[1000] border-r border-surface-dim/10 transition-all duration-300 ease-in-out" style={{ width: isCollapsed ? '5rem' : '18rem' }}>
      {/* Branding */}
      <div className={`flex items-center justify-between mb-2 px-2 w-full transition-all duration-300 ${isCollapsed ? 'flex-col gap-y-4' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
            <Icon name="auto_awesome_mosaic" filled={true} />
          </div>
          {!isCollapsed && (
            <div className="animate-reveal is-revealed">
              <h1 className="font-headline text-lg font-bold text-on-surface tracking-tight m-0 whitespace-nowrap">{BRANDING.appName}</h1>
              <p className="font-label text-xs text-secondary tracking-wide uppercase m-0 whitespace-nowrap">{BRANDING.appSubtitle}</p>
            </div>
          )}
        </div>
        <button 
          onClick={toggleCollapse} 
          className="text-outline hover:text-on-surface transition-colors border-none bg-transparent cursor-pointer flex items-center shrink-0"
        >
          <Icon name={isCollapsed ? 'menu' : 'menu_open'} size={20} />
        </button>
      </div>

      {/* Create New Content CTA */}
      <div className={`px-2 mb-4 w-full transition-all duration-300 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <Link
          href={cta.path}
          className={`btn-primary-gradient no-underline flex items-center justify-center gap-2 rounded-xl text-on-primary font-label font-bold text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all ${
            isCollapsed 
              ? 'size-10 p-0 rounded-lg shrink-0' 
              : 'w-full py-3.5 px-4 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/40'
          }`}
          title={cta.label}
        >
          <Icon name={cta.icon} size={20} />
          {!isCollapsed && <span className="whitespace-nowrap">{cta.label}</span>}
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 mt-4 space-y-1 overflow-y-auto scrollbar-thin">
        {!isCollapsed && (
          <p className="px-2 mb-3 font-label text-xs font-semibold text-outline tracking-widest uppercase m-0">Navigation</p>
        )}
        
        {visibleNavLinks.map((link) => {
          const isActive = pathname === link.path
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline ${
                isCollapsed ? 'justify-center px-1' : ''
              } ${
                isActive 
                  ? 'bg-surface-container-high text-on-surface font-semibold' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
              }`}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon name={link.icon || 'link'} size={20} filled={isActive} />
              {!isCollapsed && <span className="font-body text-sm font-medium whitespace-nowrap">{link.label}</span>}
            </Link>
          )
        })}

        {/* Content Management Group */}
        <div className="space-y-1">
          <button 
            onClick={() => !isCollapsed && setIsContentOpen(!isContentOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-none bg-transparent cursor-pointer text-left ${
              isCollapsed ? 'justify-center px-1' : ''
            } ${
              pathname.includes('collections/content-items') || pathname.includes('draft') || pathname.includes('collections/content-types')
                ? 'text-primary font-bold bg-surface-container-high' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
            }`}
            title={isCollapsed ? 'Content Management' : undefined}
          >
            <Icon name="description" filled={pathname.includes('collections/content-items') || pathname.includes('draft') || pathname.includes('collections/content-types')} />
            {!isCollapsed && <span className="font-body text-sm font-medium flex-1 whitespace-nowrap">Content Management</span>}
            {!isCollapsed && (
              <Icon 
                name={isContentOpen ? 'expand_more' : 'chevron_right'} 
                size={18} 
                className="text-outline/50" 
              />
            )}
          </button>
          
          {!isCollapsed && isContentOpen && visibleContentSubLinks.length > 0 && (
            <div className="ml-9 space-y-1 mt-1">
              {visibleContentSubLinks.map((sub) => {
                const isActive = pathname === sub.path
                return (
                  <Link
                    key={sub.path}
                    href={sub.path}
                    className={`block px-3 py-1.5 text-sm no-underline transition-colors ${
                      isActive 
                        ? 'font-semibold text-primary' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {sub.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Page Templates Group */}
        <div className="space-y-1">
          <button 
            onClick={() => !isCollapsed && setIsTemplatesOpen(!isTemplatesOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border-none bg-transparent cursor-pointer text-left ${
              isCollapsed ? 'justify-center px-1' : ''
            } ${
              pathname.includes('page-templates') || pathname.includes('templates/') 
                ? 'text-primary font-bold bg-surface-container-high' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
            }`}
            title={isCollapsed ? 'Page Templates' : undefined}
          >
            <Icon name="menu_book" filled={pathname.includes('page-templates') || pathname.includes('templates/')} />
            {!isCollapsed && <span className="font-body text-sm font-medium flex-1 whitespace-nowrap">Page Templates</span>}
            {!isCollapsed && (
              <Icon 
                name={isTemplatesOpen ? 'expand_more' : 'chevron_right'} 
                size={18} 
                className="text-outline/50" 
              />
            )}
          </button>
          
          {!isCollapsed && isTemplatesOpen && visibleTemplateSubLinks.length > 0 && (
            <div className="ml-9 space-y-1 mt-1">
              {visibleTemplateSubLinks.map((sub) => {
                const isActive = pathname === sub.path
                return (
                  <Link
                    key={sub.path}
                    href={sub.path}
                    className={`block px-3 py-1.5 text-sm no-underline transition-colors ${
                      isActive 
                        ? 'font-semibold text-primary' 
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {sub.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {visibleBottomLinks.map((link) => {
          const isActive = pathname === link.path
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all no-underline ${
                isCollapsed ? 'justify-center px-1' : ''
              } ${
                isActive 
                  ? 'bg-surface-container-high text-on-surface font-semibold' 
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
              }`}
              title={isCollapsed ? link.label : undefined}
            >
              <Icon name={link.icon || 'link'} size={20} filled={isActive} />
              {!isCollapsed && <span className="font-body text-sm font-medium whitespace-nowrap">{link.label}</span>}
            </Link>
          )
        })}
      </div>

      {/* Footer Navigation */}
      <div className="space-y-1 pt-6 border-t border-surface-dim/20 relative">
        <Link 
          href="/admin/support"
          className={`flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface transition-colors no-underline ${
            isCollapsed ? 'justify-center px-1' : ''
          }`}
          title={isCollapsed ? 'Support' : undefined}
        >
          <Icon name="support_agent" size={20} />
          {!isCollapsed && <span className="font-body text-sm">Support</span>}
        </Link>
        <Link 
          href="/admin/archive"
          className={`flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface transition-colors no-underline ${
            isCollapsed ? 'justify-center px-1' : ''
          }`}
          title={isCollapsed ? 'Archive' : undefined}
        >
          <Icon name="archive" size={20} />
          {!isCollapsed && <span className="font-body text-sm">Archive</span>}
        </Link>
        
        {user && (
          <div className={`mt-4 pt-4 border-t border-surface-dim/10 flex items-center justify-between gap-3 ${isCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-label text-xs font-bold shrink-0">
                {user.name ? user.name.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex flex-col">
                  <span className="font-label text-[10px] font-bold text-on-surface truncate leading-tight">
                    {user.name || 'User'}
                  </span>
                  <span className="font-label text-[9px] text-on-surface-variant/70 uppercase tracking-wider font-semibold leading-tight truncate">
                    {user.role || 'Editor'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => logOut()}
              className="w-8 h-8 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-error flex items-center justify-center transition-all border-none bg-transparent cursor-pointer shrink-0"
              title="Logout"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
