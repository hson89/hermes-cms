"use client"

import React, { useState } from 'react'
import { useDocumentInfo, useConfig } from '@payloadcms/ui'
import { Button } from '@/components/ui/atoms/Button'
import { Icon } from '@/components/ui/atoms/Icon'

/**
 * Story 1: Generate Marketplace Token Button
 * Displayed in the sidebar or edit view of TenantApps.
 */
interface GenerateTokenButtonProps {
  tenantId?: string | number
  appId?: string | number
}

export const GenerateTokenButton: React.FC<GenerateTokenButtonProps> = ({
  tenantId: propsTenantId,
  appId: propsAppId,
}) => {
  const { id, doc, collectionSlug } = useDocumentInfo() as any
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read_content'])

  const availableScopes = [
    { label: 'Read Content', value: 'read_content' },
    { label: 'Write Content', value: 'write_content' },
    { label: 'Inventory Read', value: 'read_stock' },
    { label: 'Order Processing', value: 'write_orders' },
  ]

  if ((collectionSlug as string) !== 'tenant-apps' || !id) return null

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setToken(null)

    try {
      const tenantId = propsTenantId || (typeof doc?.tenant === 'object' && doc.tenant !== null ? doc.tenant.id : doc?.tenant)
      const appId = propsAppId || (typeof doc?.app === 'object' && doc.app !== null ? doc.app.id : doc?.app)

      if (!tenantId || !appId) {
        throw new Error('Missing required fields: tenantId or appId. Please ensure the document is saved.')
      }

      const response = await fetch('/api/marketplace/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          appId,
          scopes: selectedScopes,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate token')

      setToken(data.token)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mt-8 p-6 bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/10 rounded-2xl animate-soft-blur-in">
      <h4 className="font-headline text-base font-bold text-on-surface mb-2 flex items-center gap-2">
        <Icon name="key" size={20} />
        Marketplace Authorization
      </h4>
      <p className="font-body text-xs text-on-surface-variant mb-4 leading-relaxed">
        Generate a secure JWT for this app installation. The token will only be shown once.
      </p>

      {!token ? (
        <>
          <div className="mb-5 space-y-2">
            <p className="text-[10px] uppercase font-label font-bold text-outline tracking-wider mb-2">Permissions</p>
            <div className="grid grid-cols-2 gap-2">
              {availableScopes.map((scope) => (
                <label 
                  key={scope.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    selectedScopes.includes(scope.value) 
                      ? 'bg-primary/5 border-primary/30 text-primary' 
                      : 'bg-surface-container border-outline-variant/10 text-on-surface-variant'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="hidden"
                  />
                  <Icon name={selectedScopes.includes(scope.value) ? 'check_box' : 'check_box_outline_blank'} size={14} />
                  <span className="text-[10px] font-bold font-label truncate">{scope.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button 
            variant="primary" 
            onClick={handleGenerate} 
            isLoading={loading}
            className="w-full py-3 text-xs uppercase tracking-widest"
          >
            Generate Token
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative group">
            <textarea
              readOnly
              value={token}
              className="w-full h-24 p-3 bg-surface-container-highest rounded-xl text-[10px] font-mono border border-primary/20 focus:outline-none resize-none"
            />
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-2 bg-primary text-on-primary rounded-lg hover:scale-105 active:scale-95 transition-transform"
              title="Copy to Clipboard"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={16} />
            </button>
          </div>
          <p className="text-[10px] text-tertiary font-bold italic text-center">
            Token copied! Secure it now; it cannot be recovered.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-[10px] text-error font-medium flex items-center gap-1.5">
          <Icon name="error" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
