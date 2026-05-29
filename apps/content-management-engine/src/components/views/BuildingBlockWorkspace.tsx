import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { BuildingBlockWorkspaceClient } from './BuildingBlockWorkspaceClient'
import { AdminView } from '../admin/AdminView'

export const BuildingBlockWorkspace = async (props: AdminViewServerProps) => {
  const params = await props.params
  
  let effectiveId: string | undefined = undefined
  const segments = (params as any)?.segments || []
  
  if (segments[0] === 'collections' && segments[1] === 'building-blocks' && segments[2]) {
    effectiveId = segments[2] === 'create' ? undefined : segments[2]
  }

  // A route is collection-based ONLY if it explicitly starts with /admin/collections.
  const isCollectionRoute = segments[0] === 'collections'
  const isStandalone = !isCollectionRoute

  const content = (
    <div className="custom-editor-view">
      <BuildingBlockWorkspaceClient serverId={effectiveId} />
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
