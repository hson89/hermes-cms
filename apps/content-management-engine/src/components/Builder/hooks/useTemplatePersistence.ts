'use client'

import { useState } from 'react'

/**
 * T016: useTemplatePersistence.
 * 
 * Custom hook to handle saving and loading template layouts
 * from the PageTemplates collection.
 */
export const useTemplatePersistence = (templateId?: string) => {
  const [isSaving, setIsSaving] = useState(false)

  const saveTemplate = async (layout: any[]) => {
    if (!templateId) {
      console.warn('Cannot save template: No templateId provided')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/page-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layout: layout.map((item) => ({
            block: item.block.id,
            mappings: item.mappings || {},
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save template layout')
      }

      const data = await response.json()
      return data
    } catch (err) {
      console.error('Error saving template:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  return {
    saveTemplate,
    isSaving,
  }
}
