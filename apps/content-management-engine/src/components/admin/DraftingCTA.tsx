"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useField } from '@payloadcms/ui'
import { Icon } from '@/components/ui/atoms/Icon'
import { Button } from '@/components/ui/atoms/Button'

export const DraftingCTA: React.FC = () => {
  const router = useRouter()

  // Reactive subscription to content type field
  const { value: contentType } = useField<any>({ path: 'contentType' })
  const [contentTypeName, setContentTypeName] = useState<string>('')

  const contentTypeId = typeof contentType === 'object' && contentType !== null 
    ? contentType.id 
    : contentType

  // Dynamically load content type name when it changes
  useEffect(() => {
    if (!contentTypeId) {
      setContentTypeName('')
      return
    }

    fetch(`/api/content-types/${contentTypeId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load content type name')
        return res.json()
      })
      .then((data) => {
        if (data && data.name) {
          setContentTypeName(data.name)
        }
      })
      .catch((err) => {
        console.error('Error fetching content type name in CTA:', err)
        setContentTypeName('')
      })
  }, [contentTypeId])

  return (
    <div className="bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/15 rounded-3xl p-8 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 animate-soft-blur-in select-none">
      <div className="flex items-center gap-6">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shrink-0">
          <Icon name="auto_awesome" size={28} filled />
        </div>
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface m-0 leading-tight">
            {contentTypeName ? `Draft ${contentTypeName} with Hermes AI` : 'Drafting with Hermes AI'}
          </h3>
          <p className="font-body text-sm text-on-surface-variant mt-1.5 max-w-md leading-relaxed">
            Instead of manual entry, use our AI architect to research, structure, and generate high-end editorial content based on your active schema.
          </p>
        </div>
      </div>
      
      <Button
        variant="primary"
        onClick={() => router.push(contentTypeId ? `/admin/draft/${contentTypeId}` : '/admin/draft')}
        className="w-full md:w-auto px-6 py-3.5 h-12 text-xs uppercase tracking-widest rounded-full shrink-0"
      >
        Go to Drafting Workspace
        <Icon name="arrow_forward" size={16} />
      </Button>
    </div>
  )
}
