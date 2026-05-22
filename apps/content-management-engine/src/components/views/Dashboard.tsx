import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { DashboardClient } from './DashboardClient'
import { AdminView } from '../admin/AdminView'

export const Dashboard = (props: AdminViewServerProps) => {
  return (
    <AdminView {...props}>
      <DashboardClient />
    </AdminView>
  )
}
