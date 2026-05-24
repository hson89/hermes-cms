"use client"

import React, { useState } from 'react'
import { useDocumentInfo, useConfig } from '@payloadcms/ui'
import { Button } from '@/components/ui/atoms/Button'
import { Icon } from '@/components/ui/atoms/Icon'

/**
 * Story 1: Generate Marketplace Token Button
 * Displayed in the sidebar or edit view of TenantApps.
 */
export const GenerateTokenButton: React.FC = () => {
  const { id, doc, collectionSlug } = useDocumentInfo()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (collectionSlug !== 'tenant-apps' || !id) return null

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setToken(null)

    try {
      const tenantId = typeof doc?.tenant === 'object' ? doc.tenant.id : doc?.tenant
      const appId = typeof doc?.app === 'object' ? doc.app.id : doc?.app

      const response = await fetch('/api/marketplace/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          appId,
          scopes: ['read_content', 'write_content'], // Default scopes for now
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
        <Button 
          variant="primary" 
          onClick={handleGenerate} 
          isLoading={loading}
          className="w-full py-3 text-xs uppercase tracking-widest"
        >
          Generate Token
        </Button>
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
              className="absolute top-2 right-2 p-2 bg-primary text-on-primary rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-transform"
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
