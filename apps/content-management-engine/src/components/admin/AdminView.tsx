import React from 'react'
import type { AdminViewServerProps } from 'payload'
import { Nav } from './Nav'
import { Header } from './Header'

interface AdminViewProps extends AdminViewServerProps {
  children: React.ReactNode
  className?: string
  hideHeader?: boolean
}

/**
 * Standardized Alexandria Admin View Wrapper.
 * 
 * Ensures all custom views:
 * 1. Correctly render our custom Nav sidebar and Header without circular imports.
 * 2. Apply a cleanup class for CSS isolation (hiding standard Payload gutters).
 * 3. Maintain consistent desktop offsets (18rem sidebar, 5rem header).
 */
export const AdminView: React.FC<AdminViewProps> = (props) => {
  const { children, className = 'custom-editor-view', hideHeader = false } = props

  return (
    <div className="template-default min-h-screen flex flex-row">
      {/* 1. Custom Left Navigation Sidebar */}
      <Nav />

      {/* 2. Content Wrap */}
      <div className="template-default__wrap flex-1 flex flex-col min-h-screen">
        {/* 3. Custom Top App Header */}
        {!hideHeader && <Header />}

        {/* 4. Child Content Container */}
        <div className={`${className} ${hideHeader ? 'no-header' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

