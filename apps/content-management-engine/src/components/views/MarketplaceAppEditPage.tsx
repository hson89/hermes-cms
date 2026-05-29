"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDocumentInfo, useAuth } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Heading } from '@/components/ui/atoms/Heading'
import { Text } from '@/components/ui/atoms/Text'
import { Button } from '@/components/ui/atoms/Button'
import { Card } from '@/components/ui/molecules/Card'
import { FormField } from '@/components/ui/molecules/FormField'
import { RegistryHeader } from '@/components/ui/molecules/RegistryHeader'
import { BRANDING } from '@/constants/branding'

/**
 * MarketplaceAppEditPage component.
 * Premium editorial interface for registering and managing global marketplace applications.
 * Follows Alexandria design system.
 */
export const MarketplaceAppEditPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const { id } = useDocumentInfo()
  const isEditMode = !!id

  // View States
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form Fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [description, setDescription] = useState('')
  const [isSlugAuto, setIsSlugAuto] = useState(true)

  // Load existing app if in Edit Mode
  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true)
      fetch(`/api/marketplace-apps/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load application')
          return res.json()
        })
        .then((data) => {
          if (data) {
            setName(data.name || '')
            setSlug(data.slug || '')
            setBaseUrl(data.baseUrl || '')
            setDescription(data.description || '')
            setIsSlugAuto(false)
          }
        })
        .catch((err) => {
          console.error(err)
          setError('Failed to load application data from registry.')
        })
        .finally(() => setIsLoading(false))
    }
  }, [id, isEditMode])

  const handleNameChange = (val: string) => {
    setName(val)
    if (isSlugAuto && !isEditMode) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setSlug(generatedSlug)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || !slug.trim() || !baseUrl.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const payloadData = {
      name,
      slug,
      baseUrl,
      description,
    }

    try {
      const url = isEditMode ? `/api/marketplace-apps/${id}` : '/api/marketplace-apps'
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
        throw new Error(result.errors?.[0]?.message || result.message || 'An error occurred while saving the application.')
      }

      setSuccess(isEditMode ? 'Application updated successfully!' : 'Application registered successfully!')
      
      setTimeout(() => {
        router.push('/admin/collections/marketplace-apps')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to submit application details.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <span className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <Text variant="body" className="text-outline font-medium">Fetching application settings...</Text>
      </div>
    )
  }

  return (
    <div className="custom-marketplace-edit-view w-full max-w-[1600px] mx-auto px-6 py-8 lg:py-10 bg-background min-h-screen font-body text-on-background antialiased">
      
      <RegistryHeader
        title={isEditMode ? 'Edit Marketplace App' : 'Register Application'}
        subtitle={isEditMode 
          ? 'Modify the service endpoint and metadata for this global marketplace integration used across tenant environments.'
          : 'Add a new 3rd-party integration to the Hermes AI global directory for tenant-wide availability.'}
        breadcrumbs={[BRANDING.appName, 'Marketplace', 'App Registry']}
        showAction={true}
        actionText="Return to List"
        actionIcon="arrow_back"
        onActionClick={() => router.push('/admin/collections/marketplace-apps')}
      />

      {success && (
        <div className="mb-8 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-3 border border-green-500/20 animate-fade-slide-up">
          <Icon name="check_circle" className="text-green-600" />
          <span className="font-body text-sm font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-500/20 animate-fade-slide-up">
          <Icon name="error" className="text-red-500" />
          <span className="font-body text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
        <div className="lg:col-span-8">
          <Card variant="low" className="border border-outline-variant/15 p-6 lg:p-8 bg-surface-container-low/30 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-6">
                <div>
                  <Heading level={4} className="mb-1 text-xl">Application Identity</Heading>
                  <Text variant="small">Structural metadata representing the external integration.</Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField 
                    label="Application Name"
                    id="name"
                    inputProps={{
                      value: name,
                      onChange: (e) => handleNameChange((e.target as HTMLInputElement).value)
                    }}
                    placeholder="e.g. Vehicle Configurator"
                    required
                  />

                  <FormField 
                    label="App Slug"
                    id="slug"
                    inputProps={{
                      value: slug,
                      onChange: (e) => {
                        setSlug((e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                        setIsSlugAuto(false)
                      }
                    }}
                    placeholder="e.g. vehicle-configurator"
                    required
                  />
                </div>

                <FormField 
                  label="Service Base URL"
                  id="baseUrl"
                  inputProps={{
                    value: baseUrl,
                    onChange: (e) => setBaseUrl((e.target as HTMLInputElement).value)
                  }}
                  placeholder="https://api.external-app.com"
                  required
                />

                <div className="space-y-2">
                  <label htmlFor="description" className="block font-label text-sm font-bold text-on-surface mb-1.5">
                    App Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe what this integration provides..."
                    className="w-full min-h-[120px] p-4 bg-surface-container rounded-2xl border border-outline-variant/15 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-body text-sm text-on-surface outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-4 border-t border-outline-variant/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/admin/collections/marketplace-apps')}
                  className="uppercase tracking-widest text-xs px-6"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="uppercase tracking-widest text-xs px-8"
                >
                  {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Application' : 'Register Application')}
                </Button>
              </div>

            </form>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card variant="low" className="p-6 border border-outline-variant/15 bg-surface-container-low/20 backdrop-blur-sm">
            <h4 className="font-headline text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
              <Icon name="hub" size={18} className="text-primary" />
              Integration Architecture
            </h4>
            <ul className="text-xs text-on-surface-variant space-y-4 list-none p-0 m-0">
              <li className="flex gap-3">
                <Icon name="language" size={16} className="text-primary/60 shrink-0" />
                <span className="leading-relaxed">Base URL acts as the root for all service-to-service communication.</span>
              </li>
              <li className="flex gap-3">
                <Icon name="key" size={16} className="text-primary/60 shrink-0" />
                <span className="leading-relaxed">Slugs are used to generate unique circuit breaker keys in the AI microservice.</span>
              </li>
              <li className="flex gap-3">
                <Icon name="extension" size={16} className="text-primary/60 shrink-0" />
                <span className="leading-relaxed">Once registered, this app becomes available for installation across all tenant workspaces.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

    </div>
  )
}
