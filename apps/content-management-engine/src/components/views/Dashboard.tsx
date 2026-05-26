import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { DashboardClient } from './DashboardClient'
import { AdminView } from '../admin/AdminView'
import { BRANDING } from '@/constants/branding'

export const Dashboard = (props: AdminViewServerProps) => {
  return (
    <AdminView 
      {...props}
      topNavProps={{
        breadcrumbs: [
          { label: BRANDING.appName, path: '/admin' },
          { label: 'Dashboard' },
        ],
      }}
    >
      <DashboardClient />
    </AdminView>
  )
}
