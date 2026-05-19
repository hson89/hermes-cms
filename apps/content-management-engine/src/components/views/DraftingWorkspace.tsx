import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { AdminView } from '../admin/AdminView'
import { DraftingWorkspaceClient } from './DraftingWorkspaceClient'

export const DraftingWorkspace = (props: AdminViewServerProps) => {
  return (
    <AdminView {...props} className="custom-editor-view">
      <DraftingWorkspaceClient />
    </AdminView>
  )
}
