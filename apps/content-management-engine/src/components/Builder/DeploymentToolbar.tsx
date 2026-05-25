'use client'

import React, { useState, useEffect } from 'react'

interface DeploymentToolbarProps {
  onSave?: () => void
  isSaving?: boolean
  templateId?: string
  templateName?: string
}

/**
 * T028: DeploymentToolbar.
 * 
 * Provides save, deploy and validation status.
 */
export const DeploymentToolbar: React.FC<DeploymentToolbarProps> = ({ 
  onSave, 
  isSaving, 
  templateId,
  templateName 
}) => {
  const [sites, setSites] = useState<any[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/hosted-sites?limit=100')
      .then((res) => res.json())
      .then((data) => {
        const docs = data.docs || []
        setSites(docs)
        if (docs.length > 0) setSelectedSiteId(docs[0].id)
      })
  }, [])

  const handleDeploy = async () => {
    if (!templateId || !selectedSiteId) return

    setIsDeploying(true)
    setDeployError(null)
    try {
      const res = await fetch('/api/templates/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, siteId: selectedSiteId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deployment failed')
      alert('Deployment triggered successfully!')
    } catch (err: any) {
      setDeployError(err.message)
      alert(`Deployment failed: ${err.message}`)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <header className="h-16 border-b border-surface-container-low bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between px-6 z-30 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="font-headline text-xl font-semibold text-on-surface">
          {templateName || 'Untitled Template'}
        </h2>
        <span className="px-2.5 py-1 bg-surface-container-high text-on-surface-variant rounded-md font-label text-xs tracking-wide">
          Draft
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Viewport Switcher */}
        <div className="flex items-center bg-surface-container-low rounded-lg p-1 mr-2">
          <button className="px-3 py-1.5 rounded-md bg-surface-container-lowest text-on-surface shadow-sm font-label text-xs font-medium cursor-pointer border-none">
            Desktop
          </button>
          <button className="px-3 py-1.5 rounded-md text-on-surface-variant hover:text-on-surface font-label text-xs font-medium bg-transparent cursor-pointer border-none">
            Tablet
          </button>
          <button className="px-3 py-1.5 rounded-md text-on-surface-variant hover:text-on-surface font-label text-xs font-medium bg-transparent cursor-pointer border-none">
            Mobile
          </button>
        </div>

        {/* History Controls */}
        <button className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-low transition-colors bg-transparent cursor-pointer border-none flex items-center">
          <span className="material-symbols-outlined">undo</span>
        </button>
        <button className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-low transition-colors bg-transparent cursor-pointer border-none flex items-center">
          <span className="material-symbols-outlined">redo</span>
        </button>

        <div className="w-px h-6 bg-surface-container-low mx-1"></div>

        {/* Site Selector */}
        <div className="flex items-center gap-2 mr-2">
          <label className="font-label text-[10px] font-semibold text-outline uppercase tracking-wider">Site</label>
          <div className="relative">
            <select 
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-md py-1.5 pl-2 pr-8 text-xs font-body text-on-surface appearance-none focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-1.5 top-1.5 text-on-surface-variant text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        <button 
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg font-label text-sm font-medium text-primary hover:bg-primary-fixed/50 transition-colors bg-transparent cursor-pointer border-none disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>

        <button 
          onClick={handleDeploy}
          disabled={isDeploying || !templateId || !selectedSiteId}
          className="px-5 py-2 rounded-lg font-label text-sm font-semibold bg-primary text-on-primary shadow-sm hover:bg-primary-container transition-colors flex items-center gap-2 border-none cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">rocket_launch</span>
          {isDeploying ? 'Deploying...' : 'Deploy'}
        </button>
      </div>
    </header>
  )
}
