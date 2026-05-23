import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { DraftingWorkspaceClient } from './DraftingWorkspaceClient'
import { AdminView } from '../admin/AdminView'

export const DraftingWorkspace = (props: AdminViewServerProps) => {
  return (
    <AdminView {...props} hideHeader={true}>
      <DraftingWorkspaceClient />
    </AdminView>
  )
}
