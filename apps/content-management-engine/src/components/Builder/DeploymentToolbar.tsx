'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '../ui/atoms/Icon'

interface DeploymentToolbarProps {
  onSave?: () => void
  isSaving?: boolean
  templateId?: string
  templateName?: string
  archetype?: string
  category?: string
  onDeploy?: () => void
}

/**
 * T028: DeploymentToolbar (Refactored to Alexandria Designer Design).
 * 
 * Provides navigation, viewport toggles, and action controls for the Designer.
 */
export const DeploymentToolbar: React.FC<DeploymentToolbarProps> = ({ 
  onSave, 
  isSaving, 
  templateId,
  templateName,
  archetype = 'Landing Page',
  category = 'Page Templates / Visual Builder',
  onDeploy
}) => {
  const router = useRouter()
  const [activeViewport, setActiveViewport] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const hasActiveTemplate = !!templateId && templateId !== 'new'

  return (
    <header className="designer-toolbar h-16 border-b border-outline-variant bg-surface flex items-center justify-between px-6 z-30 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="text-outline hover:text-on-surface transition-colors bg-transparent border-none cursor-pointer flex items-center"
        >
          <Icon name="arrow_back" size={24} />
        </button>
        <div className="flex flex-col">
          <h2 className="text-lg font-headline font-bold m-0 leading-tight">
            {templateName || 'Template Builder'}
          </h2>
          <p className="text-[10px] text-outline font-label uppercase tracking-widest m-0 mt-0.5">
            {category}{templateName ? ` / ${templateName}` : ''}
          </p>
        </div>
      </div>

      {hasActiveTemplate && (
        <div className="flex items-center gap-3">
          {/* Viewport Switcher */}
          <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant mr-4">
            <button 
              onClick={() => setActiveViewport('desktop')}
              className={`px-3 py-1 rounded transition-all flex items-center gap-1 border border-transparent cursor-pointer ${
                activeViewport === 'desktop' 
                  ? 'bg-surface-container-lowest shadow-sm text-primary border-outline-variant/30' 
                  : 'text-outline hover:text-on-surface-variant bg-transparent'
              }`}
            >
              <Icon name="desktop_windows" size={18} />
            </button>
            <button 
              onClick={() => setActiveViewport('tablet')}
              className={`px-3 py-1 rounded transition-all flex items-center gap-1 border border-transparent cursor-pointer ${
                activeViewport === 'tablet' 
                  ? 'bg-surface-container-lowest shadow-sm text-primary border-outline-variant/30' 
                  : 'text-outline hover:text-on-surface-variant bg-transparent'
              }`}
            >
              <Icon name="tablet_mac" size={18} />
            </button>
            <button 
              onClick={() => setActiveViewport('mobile')}
              className={`px-3 py-1 rounded transition-all flex items-center gap-1 border border-transparent cursor-pointer ${
                activeViewport === 'mobile' 
                  ? 'bg-surface-container-lowest shadow-sm text-primary border-outline-variant/30' 
                  : 'text-outline hover:text-on-surface-variant bg-transparent'
              }`}
            >
              <Icon name="smartphone" size={18} />
            </button>
          </div>

          <button className="px-4 py-2 text-primary font-label text-sm font-bold uppercase tracking-widest hover:bg-primary/5 rounded transition-all border-none bg-transparent cursor-pointer">
            Preview
          </button>

          <button 
            onClick={onDeploy}
            className="px-4 py-2 text-primary font-label text-sm font-bold uppercase tracking-widest hover:bg-primary/5 rounded transition-all border-none bg-transparent cursor-pointer flex items-center gap-1"
          >
            <Icon name="publish" size={18} /> Deploy
          </button>
          
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest rounded hover:opacity-90 transition-opacity border-none cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Block'}
          </button>
        </div>
      )}
    </header>
  )
}
