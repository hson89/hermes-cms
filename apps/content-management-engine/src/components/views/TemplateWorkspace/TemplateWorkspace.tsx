import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { TemplateWorkspaceClient } from './TemplateWorkspaceClient'
import { BuilderWorkspace } from '../../Builder/BuilderWorkspace'
import { AdminView } from '../../admin/AdminView'

export const TemplateWorkspace = async (props: AdminViewServerProps) => {
  const params = await props.params
  
  let effectiveId: string | undefined = undefined
  const segments = (params as any)?.segments || []
  
  const isBuilderPath = segments[0] === 'templates' && segments[1] === 'builder'

  // Parse Next.js catch-all segments: /admin/templates/builder/1 -> ['templates', 'builder', '1']
  if (isBuilderPath && segments[2]) {
    effectiveId = segments[2]
  } else if (segments[0] === 'collections' && segments[1] === 'page-templates' && segments[2]) {
    effectiveId = segments[2] === 'create' ? undefined : segments[2]
  }

  // A route is collection-based ONLY if it explicitly starts with /admin/collections.
  const isCollectionRoute = props.route?.path?.startsWith('/admin/collections')
  const isStandalone = !isCollectionRoute

  if (isBuilderPath) {
    return <BuilderWorkspace />
  }

  const content = (
    <div className="custom-editor-view">
      <TemplateWorkspaceClient serverId={effectiveId} />
    </div>
  )

  if (isStandalone) {
    return (
      <AdminView 
        {...props}
        hideHeader={true}
      >
        {content}
      </AdminView>
    )
  }

  return content
}

