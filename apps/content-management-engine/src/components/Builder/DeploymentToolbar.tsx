'use client'

import React, { useState, useEffect } from 'react'

interface DeploymentToolbarProps {
  onSave?: () => void
  isSaving?: boolean
  templateId?: string
}

/**
 * T028: DeploymentToolbar.
 * 
 * Provides save, deploy and validation status.
 */
export const DeploymentToolbar: React.FC<DeploymentToolbarProps> = ({ onSave, isSaving, templateId }) => {
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
    <div className="builder-toolbar h-16 border-b border-white/15 flex items-center justify-between px-6 bg-black/5 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-serif">Template Builder</h2>
        {deployError && (
          <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-sm border border-red-400/20">
            {deployError}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-widest opacity-40">Target Site</label>
          <select 
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-sm text-xs px-2 py-1 outline-none focus:border-white/30"
          >
            {sites.map(site => (
              <option key={site.id} value={site.id} className="bg-[#1a1a1a]">{site.name}</option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex gap-4">
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm rounded-sm border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={handleDeploy}
            disabled={isDeploying || !templateId || !selectedSiteId}
            className="px-4 py-2 text-sm rounded-sm bg-[#3366cc] text-white hover:bg-[#3366cc]/90 transition-colors disabled:opacity-50"
          >
            {isDeploying ? 'Deploying...' : 'Deploy'}
          </button>
        </div>
      </div>
    </div>
  )
}

