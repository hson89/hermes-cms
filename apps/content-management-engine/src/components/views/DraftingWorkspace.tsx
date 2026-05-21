import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { DraftingWorkspaceClient } from './DraftingWorkspaceClient'

export const DraftingWorkspace = (props: AdminViewServerProps) => {
  return (
    <div className="custom-editor-view" style={{ marginTop: '5rem' }}>
      <DraftingWorkspaceClient />
    </div>
  )
}
