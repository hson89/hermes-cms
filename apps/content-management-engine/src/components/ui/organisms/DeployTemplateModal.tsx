"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Icon } from '@/components/ui/atoms/Icon'
import { useClickOutside } from '@/hooks/useClickOutside'

interface HostedSite {
  id: string | number
  name: string
  domain?: string
  tenant: any
}

interface DeployTemplateModalProps {
  isOpen: boolean
  templateId: string | number | null
  templateName: string
  templateTenantId?: string | number | null
  isGlobalTemplate?: boolean
  onClose: () => void
}

export const DeployTemplateModal: React.FC<DeployTemplateModalProps> = ({
  isOpen,
  templateId,
  templateName,
  templateTenantId,
  isGlobalTemplate = false,
  onClose,
}) => {
  const [hostedSites, setHostedSites] = useState<HostedSite[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string | number>('')
  const [isLoadingSites, setIsLoadingSites] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deploySuccess, setDeploySuccess] = useState(false)
  const [deploymentId, setDeploymentId] = useState<string | number | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false))

  // Global key listener for Escape closing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDropdownOpen) {
          setIsDropdownOpen(false)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleGlobalKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [isOpen, isDropdownOpen, onClose])

  // Fetch hosted sites
  useEffect(() => {
    if (!isOpen || !templateId) return

    const fetchSites = async () => {
      setIsLoadingSites(true)
      setDeployError(null)
      setDeploySuccess(false)
      setDeploymentId(null)
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
        const headers: HeadersInit = {}
        if (token) headers['Authorization'] = `JWT ${token}`

        const res = await fetch('/api/hosted-sites?limit=100', { headers })
        if (res.ok) {
          const data = await res.json()
          const docs = data.docs || []
          setHostedSites(docs)
          
          // Filter logic for initial selection
          const initialFiltered = isGlobalTemplate || !templateTenantId
            ? docs
            : docs.filter((site: any) => {
                const siteTenantId = typeof site.tenant === 'object' && site.tenant !== null ? site.tenant.id : site.tenant
                return String(siteTenantId) === String(templateTenantId)
              })

          if (initialFiltered.length > 0) {
            setSelectedSiteId(initialFiltered[0].id)
          } else {
            setSelectedSiteId('')
          }
        } else {
          throw new Error('Failed to retrieve hosted sites')
        }
      } catch (err: any) {
        setDeployError(err.message || 'Error loading hosted sites')
      } finally {
        setIsLoadingSites(false)
      }
    }

    fetchSites()
  }, [isOpen, templateId, templateTenantId, isGlobalTemplate])

  // Filter sites based on tenant if not global
  const filteredSites = useMemo(() => {
    if (isGlobalTemplate || !templateTenantId) return hostedSites
    return hostedSites.filter(site => {
      const siteTenantId = typeof site.tenant === 'object' && site.tenant !== null ? site.tenant.id : site.tenant
      return String(siteTenantId) === String(templateTenantId)
    })
  }, [hostedSites, templateTenantId, isGlobalTemplate])

  const selectedSite = useMemo(() => {
    return filteredSites.find(s => String(s.id) === String(selectedSiteId))
  }, [filteredSites, selectedSiteId])

  const handleDeploy = async () => {
    if (!templateId || !selectedSiteId) return

    setIsDeploying(true)
    setDeployError(null)
    setDeploySuccess(false)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('payload-token') : null
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `JWT ${token}`

      const res = await fetch('/api/templates/deploy', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          templateId,
          siteId: selectedSiteId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed')
      }

      setDeploySuccess(true)
      setDeploymentId(data.deployment?.id || null)
    } catch (err: any) {
      setDeployError(err.message || 'An unexpected error occurred during deployment.')
    } finally {
      setIsDeploying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-fade-in">
      <div 
        className="bg-surface/90 backdrop-blur-[20px] max-w-md w-full rounded-2xl p-6 border border-outline-variant/15 modal-shadow flex flex-col space-y-4 animate-fade-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="rocket_launch" size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface m-0">Deploy to Hosted Site</h3>
              <p className="font-body text-[11px] text-outline m-0 mt-0.5">Apply blueprint template to a live site</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-outline hover:text-on-surface transition-colors cursor-pointer border-none bg-transparent flex items-center p-1"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Success State */}
        {deploySuccess ? (
          <div className="flex flex-col space-y-4 py-4 text-center items-center">
            <div className="size-16 rounded-full bg-success/15 flex items-center justify-center border border-success/20 animate-scale-in">
              <Icon name="check_circle" className="text-success" size={36} />
            </div>
            <div className="space-y-1">
              <h4 className="font-headline font-bold text-base text-on-surface">Deployment Triggered!</h4>
              <p className="font-body text-xs text-outline px-4">
                The sync process for <span className="font-semibold text-on-background">"{templateName}"</span> to site <span className="font-semibold text-on-background">"{selectedSite?.name}"</span> has been successfully initiated.
              </p>
            </div>
            <div className="flex flex-col w-full gap-2 pt-4">
              {deploymentId && (
                <a
                  href={`/admin/collections/template-deployments/${deploymentId}`}
                  onClick={onClose}
                  className="w-full bg-primary text-white font-label font-bold text-xs uppercase tracking-widest py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer no-underline"
                >
                  <Icon name="receipt_long" size={16} /> View Deployment Log
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full border border-outline-variant/15 text-on-surface hover:bg-surface-container py-3 px-5 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent"
              >
                Close Dialog
              </button>
            </div>
          </div>
        ) : (
          /* Input / Action Form State */
          <div className="flex flex-col space-y-4">
            <div className="bg-surface-container-low p-4 rounded-xl space-y-1">
              <span className="font-label text-[10px] uppercase tracking-wider text-outline">Selected Template</span>
              <div className="font-headline font-bold text-sm text-on-surface-variant">
                {templateName}
              </div>
            </div>

            {deployError && (
              <div className="bg-error/10 text-error p-3.5 rounded-xl flex items-start gap-2.5 border border-error/25 text-xs font-body font-medium">
                <Icon name="error" className="shrink-0 mt-0.5" size={16} />
                <span>{deployError}</span>
              </div>
            )}

            {isLoadingSites ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="size-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="font-label text-[10px] font-bold text-outline uppercase tracking-wider">Loading sites...</span>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="flex flex-col py-6 text-center items-center justify-center space-y-3">
                <div className="size-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                  <Icon name="dns" size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-headline font-bold text-sm text-on-surface">No Hosted Sites Found</h4>
                  <p className="font-body text-xs text-outline px-4 leading-relaxed">
                    There are no registered sites configured for this tenant workspace.
                  </p>
                </div>
                <a
                  href="/admin/collections/hosted-sites/create"
                  onClick={onClose}
                  className="mt-2 text-primary font-label text-xs font-bold uppercase tracking-wide hover:underline flex items-center gap-1"
                >
                  Create Hosted Site <Icon name="arrow_forward" size={14} />
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <label className="block font-label text-xs uppercase tracking-wider text-outline">Target Hosted Site</label>
                  
                  {/* Custom ARIA Accessible Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="listbox"
                    className="w-full bg-white text-on-background border border-outline-variant/30 py-3 px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-primary focus:outline-none transition-all flex items-center justify-between text-left cursor-pointer hover:border-outline-variant/60"
                  >
                    <div>
                      <div className="font-body text-sm font-semibold">{selectedSite?.name}</div>
                      {selectedSite?.domain && (
                        <div className="font-body text-[10px] text-outline mt-0.5">{selectedSite.domain}</div>
                      )}
                    </div>
                    <Icon name="expand_more" className={`text-outline transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Options Listbox */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl shadow-xl z-50 animate-reveal is-revealed max-h-60 overflow-y-auto scrollbar-thin">
                      <ul className="py-1.5 list-none p-0 m-0" role="listbox">
                        {filteredSites.map((site) => {
                          const isSelected = String(site.id) === String(selectedSiteId)
                          return (
                            <li key={site.id} role="option" aria-selected={isSelected}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSiteId(site.id)
                                  setIsDropdownOpen(false)
                                }}
                                className={`w-full text-left px-4 py-2.5 border-none bg-transparent cursor-pointer transition-colors hover:bg-surface-container-high flex flex-col ${
                                  isSelected ? 'text-primary bg-primary/5' : 'text-on-surface'
                                }`}
                              >
                                <span className="font-body text-xs font-semibold">{site.name}</span>
                                {site.domain && (
                                  <span className="font-body text-[9px] text-outline mt-0.5">{site.domain}</span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                  <button
                    type="button"
                    disabled={isDeploying}
                    onClick={onClose}
                    className="border border-outline-variant/15 text-on-surface hover:bg-surface-container py-2.5 px-4.5 rounded-xl transition-all font-label font-bold text-xs uppercase tracking-widest cursor-pointer bg-transparent focus:outline-none"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isDeploying || !selectedSiteId}
                    onClick={handleDeploy}
                    className="bg-primary hover:bg-primary/95 text-white font-label font-bold text-xs uppercase tracking-widest py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary/10"
                  >
                    {isDeploying ? (
                      <>
                        Deploying...
                        <span className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </>
                    ) : (
                      <>
                        <Icon name="publish" size={14} /> Trigger Deploy
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
