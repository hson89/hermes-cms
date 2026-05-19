import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'

interface AdminViewProps extends AdminViewServerProps {
  children: React.ReactNode
  className?: string
}

/**
 * Standardized Alexandria Admin View Wrapper.
 * 
 * Ensures all custom views:
 * 1. Correcty inherit the Alexandria layout (Nav, Header) via DefaultTemplate.
 * 2. Apply a cleanup class for CSS isolation (hiding standard Payload gutters).
 * 3. Maintain consistent desktop offsets (18rem sidebar, 5rem header).
 */
export const AdminView: React.FC<AdminViewProps> = (props) => {
  const { initPageResult, params, searchParams, children, className = 'custom-editor-view' } = props

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user || undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <div className={`${className} lg:ml-[18rem]`} style={{ marginTop: '5rem' }}>
        {children}
      </div>
    </DefaultTemplate>
  )
}
