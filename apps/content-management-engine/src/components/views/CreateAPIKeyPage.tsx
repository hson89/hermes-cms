"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDocumentInfo, useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Button } from '@/components/ui/atoms/Button'
import { Label } from '@/components/ui/atoms/Label'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { Card } from '@/components/ui/molecules/Card'
import { Badge } from '@/components/ui/atoms/Badge'
import { Tenant, ApiKey } from '@/payload-types'

export const CreateAPIKeyPage: React.FC = () => {
  const router = useRouter()
  const { id } = useDocumentInfo()
  const { user: currentUser } = useAuth()
  const isEditMode = !!id

  // View States
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [enableAPIKey, setEnableAPIKey] = useState<boolean>(true)

  // API Secret State (returned only on initial create!)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Tenant list for select mapping
  const [tenants, setTenants] = useState<Tenant[]>([])

  // Load available tenants relative to current user scope
  useEffect(() => {
    fetch('/api/tenants?limit=100')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to retrieve workspace tenants.')
        return res.json()
      })
      .then((data) => {
        if (data && data.docs) {
          const docsList = data.docs as Tenant[]
          setTenants(docsList)
          
          // Auto pre-select if only one tenant is available
          if (docsList.length === 1) {
            setSelectedTenantId(String(docsList[0].id))
          }
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Failed to fetch active workspace tenant list.')
      })
  }, [])

  // Load existing API Key settings under Edit Mode
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true)
      fetch(`/api/api-keys/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to retrieve API key details.')
          return res.json()
        })
        .then((data: ApiKey) => {
          if (data) {
            setLabel(data.label || '')
            setEmail(data.email || '')
            setEnableAPIKey(data.enableAPIKey !== false)
            
            // Format date correctly for input field (YYYY-MM-DD) avoiding timezone shifts
            if (data.expiresAt) {
              const d = new Date(data.expiresAt)
              // Add timezone offset to keep date consistent with the stored UTC date
              const userTimezoneOffset = d.getTimezoneOffset() * 60000
              const localDate = new Date(d.getTime() + userTimezoneOffset)
              const year = localDate.getFullYear()
              const month = String(localDate.getMonth() + 1).padStart(2, '0')
              const day = String(localDate.getDate()).padStart(2, '0')
              const formattedDate = `${year}-${month}-${day}`
              setExpiresAt(formattedDate)
            } else {
              setExpiresAt('')
            }

            // Extract Tenant relationship ID
            if (data.tenant) {
              const tid = typeof data.tenant === 'object' ? data.tenant.id : data.tenant
              setSelectedTenantId(String(tid))
            }
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Failed to fetch existing API key credentials.')
        })
        .finally(() => setIsLoading(false))
    }
  }, [id, isEditMode])

  // Clipboard copy helper
  const handleCopyKey = () => {
    if (!generatedKey) return
    navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Immediate toggle status (PATCH) under Edit Mode to prevent out-of-sync status states
  const handleToggleStatus = async () => {
    if (!isEditMode) {
      setEnableAPIKey(!enableAPIKey)
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const nextState = !enableAPIKey
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enableAPIKey: nextState,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Failed to update token status.')
      }

      setEnableAPIKey(nextState)
      setSuccess(`API Key status successfully updated to ${nextState ? 'Active' : 'Suspended'}.`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to update token status.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!label.trim()) {
      setError('Please provide a descriptive label name.')
      return
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!selectedTenantId) {
      setError('An API Key must be bound to a workspace tenant.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const payloadData: Record<string, any> = {
      label,
      email,
      tenant: parseInt(selectedTenantId, 10),
      enableAPIKey,
    }

    if (expiresAt) {
      // Standard ISO timestamp for date field
      payloadData.expiresAt = new Date(expiresAt).toISOString()
    } else {
      payloadData.expiresAt = null
    }

    try {
      const url = isEditMode ? `/api/api-keys/${id}` : '/api/api-keys'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadData),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || 'An error occurred while saving API key configurations.')
      }

      if (isEditMode) {
        setSuccess('API Key configurations updated successfully!')
        setTimeout(() => {
          router.push('/admin/collections/api-keys')
          router.refresh()
        }, 1500)
      } else {
        // Successful creation returns the plain generated api key!
        setSuccess('API programmatic access credentials successfully provisioned!')
        if (result.doc?.apiKey) {
          setGeneratedKey(result.doc.apiKey)
        } else if (result.apiKey) {
          setGeneratedKey(result.apiKey)
        } else {
          // Fallback if structured nested differently
          console.warn('API key field missing in direct response document structure:', result)
          setGeneratedKey('Check generated settings registry list.')
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to submit access token changes.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <span className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <Text variant="body" className="text-outline font-medium">Fetching access token schema...</Text>
      </div>
    )
  }

  return (
    <div className="custom-api-key-view w-full max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-surface-bright min-h-[80vh] font-body text-on-surface antialiased">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline-variant/15 pb-6 mb-8 gap-4">
        <div>
          <span className="font-label text-[10px] uppercase tracking-widest text-outline font-bold">Identity &amp; Governance</span>
          <Heading level={2} className="mt-1">
            {isEditMode ? `Configure API Key: ${label}` : 'Provision API Access Key'}
          </Heading>
          <Text variant="small" className="mt-1 max-w-xl">
            {isEditMode 
              ? 'Update the description, adjust active/revoked states, or tweak tenant visibility boundaries.'
              : 'Generate secure programmatically scopes API credentials to authenticate SSG build pipelines.'}
          </Text>
        </div>
        
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/admin/collections/api-keys')}
          className="uppercase tracking-widest text-xs"
        >
          <Icon name="arrow_back" size={16} />
          Return to Registry
        </Button>
      </div>

      {/* Success Notification Banner */}
      {success && !generatedKey && (
        <div className="mb-8 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-500/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-green-600" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-500/20 animate-fade-slide-up">
          <Icon name="error" className="text-red-500" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Programmatic Secret Key Display - High impact success notification card */}
      {generatedKey && (
        <Card variant="high" className="mb-8 border border-green-500/35 bg-green-500/5 p-6 animate-fade-slide-up relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center flex-shrink-0">
              <Icon name="verified" size={24} />
            </div>
            <div className="space-y-2 w-full">
              <Heading level={4} className="text-green-700 dark:text-green-400 font-bold">
                API Key Successfully Provisioned!
              </Heading>
              <Text variant="small" className="text-outline max-w-2xl leading-relaxed">
                Copy this secure access token immediately. For cryptographic security, this is the <span className="font-bold underline">only time</span> this plain-text secret token is returned by the database. If lost, you must revoke this key and provision a new instance.
              </Text>

              {/* Secure Token Copy Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4 w-full">
                <div className="flex-grow font-mono text-sm bg-surface-container px-4 py-3.5 rounded-xl border border-outline-variant/15 select-all break-all text-on-surface flex items-center justify-between">
                  <span>{generatedKey}</span>
                </div>
                <Button 
                  type="button" 
                  onClick={handleCopyKey}
                  variant={copied ? 'secondary' : 'primary'}
                  className="sm:w-auto uppercase tracking-widest text-xs flex items-center gap-2 font-bold px-6 py-3.5"
                >
                  <Icon name={copied ? 'done' : 'content_copy'} size={16} />
                  {copied ? 'Copied!' : 'Copy Key'}
                </Button>
              </div>

              <div className="pt-4">
                <Button 
                  type="button" 
                  onClick={() => {
                    router.push('/admin/collections/api-keys')
                    router.refresh()
                  }}
                  variant="secondary"
                  className="uppercase tracking-widest text-xs"
                >
                  Done, Return to Registry
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main split dashboard view */}
      {!generatedKey && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Key Profile Summary Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card variant="low" className="border border-outline-variant/15 p-6 bg-surface-container-low/30 relative overflow-hidden flex flex-col items-center text-center">
              
              {/* Decorative Glass Circle */}
              <div className="absolute -top-12 -right-12 size-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
              
              {/* Monogram Monolith */}
              <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-label font-bold text-2xl mb-4">
                <Icon name="vpn_key" size={32} />
              </div>

              <Heading level={3} className="font-bold tracking-tight text-on-surface">
                {label || 'New Key'}
              </Heading>
              
              <Text variant="small" className="text-outline mt-1 font-mono break-all max-w-[240px]">
                {email || 'no-email-assigned'}
              </Text>

              {/* Status Badge */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Badge color={enableAPIKey ? 'success' : 'danger'} size="sm" icon={enableAPIKey ? 'check_circle' : 'block'}>
                  {enableAPIKey ? 'Token Enabled' : 'Token Suspended'}
                </Badge>
                {isEditMode && (
                  <Badge color="primary" size="sm" icon="lock_open">
                    Key Registered
                  </Badge>
                )}
              </div>

              <div className="w-full pt-6 mt-6" />

              {/* Metadata Details */}
              <div className="w-full text-left space-y-3 font-label text-xs">
                <div className="flex justify-between items-center text-outline">
                  <span>Scopes:</span>
                  <span className="font-semibold text-on-surface">Content Delivery API</span>
                </div>
                <div className="flex justify-between items-center text-outline">
                  <span>Type:</span>
                  <span className="font-semibold text-on-surface">Long-Lived Bearer Token</span>
                </div>
                {isEditMode && (
                  <div className="flex justify-between items-center text-outline">
                    <span>Key Status:</span>
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      disabled={isSubmitting}
                      className="border-none bg-transparent text-primary hover:underline font-bold tracking-wider uppercase text-[10px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enableAPIKey ? 'Suspend Token' : 'Activate Token'}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 text-xs text-outline space-y-2 leading-relaxed">
              <div className="flex gap-2 text-primary font-bold">
                <Icon name="shield" size={14} />
                <span>Security Guidelines</span>
              </div>
              <p>
                API keys are sensitive credentials. Ensure you never commit them to code repositories, expose them in client-side codebases, or share them in unencrypted messaging systems.
              </p>
            </div>
          </div>

          {/* Right Column: Settings & Mapping forms */}
          <div className="lg:col-span-8 space-y-6">
            <Card variant="low" className="border border-outline-variant/15 p-6 md:p-8 bg-surface-container-low/30 space-y-6">
              
              <div className="space-y-4">
                <Heading level={4} className="font-bold text-on-surface tracking-tight">
                  Token Metadata
                </Heading>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Label Input */}
                  <div className="space-y-2">
                    <Label htmlFor="label" className="text-xs uppercase font-label tracking-wider text-outline font-bold">Key Label</Label>
                    <Input
                      id="label"
                      type="text"
                      value={label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
                      placeholder="e.g. Production Staging Server"
                      required
                    />
                    <span className="text-[10px] text-outline block">A descriptive name to audit this access token's usage.</span>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs uppercase font-label tracking-wider text-outline font-bold">Owner Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      placeholder="programmatic-token@domain.com"
                      required
                    />
                    <span className="text-[10px] text-outline block">Identifier email address associated with programmatic API key auth.</span>
                  </div>

                  {/* Tenant Workspace Bound */}
                  <div className="space-y-2">
                    <Label htmlFor="tenant" className="text-xs uppercase font-label tracking-wider text-outline font-bold">Workspace Tenant Scope</Label>
                    <Select
                      id="tenant"
                      value={selectedTenantId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTenantId(e.target.value)}
                      disabled={isEditMode}
                    >
                      <option value="">Select Tenant Bound...</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name} ({t.slug})
                        </option>
                      ))}
                    </Select>
                    <span className="text-[10px] text-outline block">
                      {isEditMode 
                        ? 'Workspace tenant bindings cannot be updated once a key is provisioned.' 
                        : 'Securely scopes this key to only read/write resources inside the selected tenant isolation boundary.'}
                    </span>
                  </div>

                  {/* Expiration Date Pick */}
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt" className="text-xs uppercase font-label tracking-wider text-outline font-bold">Expiration Boundary (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={expiresAt}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiresAt(e.target.value)}
                    />
                    <span className="text-[10px] text-outline block">Select an expiration date. Leave blank for a perpetual token.</span>
                  </div>

                </div>

                {/* API Key Enabled toggle */}
                <div className="pt-4 flex items-center gap-3">
                  <input
                    id="enableAPIKey"
                    type="checkbox"
                    checked={enableAPIKey}
                    onChange={(e) => setEnableAPIKey(e.target.checked)}
                    className="size-4.5 rounded text-primary border-outline-variant/15 focus:ring-primary cursor-pointer"
                  />
                  <Label htmlFor="enableAPIKey" className="text-sm font-semibold text-on-surface cursor-pointer select-none">
                    Enable and Activate programmatic API Key Strategy
                  </Label>
                </div>

              </div>

              {/* Form submit/cancel footer */}
              <div className="flex justify-end items-center gap-4 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/admin/collections/api-keys')}
                  className="uppercase tracking-widest text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="uppercase tracking-widest text-xs font-bold px-6 py-3.5 flex items-center gap-2"
                >
                  {isSubmitting && <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0" />}
                  {isEditMode ? 'Save Changes' : 'Generate Plain Token'}
                </Button>
              </div>

            </Card>
          </div>

        </form>
      )}

    </div>
  )
}
