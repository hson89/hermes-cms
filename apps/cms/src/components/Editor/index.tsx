'use client'

import React from 'react'
import { CopilotSidebar } from './CopilotSidebar'
import { FieldLabel } from '@payloadcms/ui'
import { useField } from '@payloadcms/ui'

/**
 * T021 / T024 - Custom Editor component wrapping the default Rich Text editor and adding Copilot UI.
 * Note: In a full implementation, this would integrate deeply with Lexical.
 * For MVP, we render the Copilot Sidebar below the rich text editor (which we'll keep as default in the config for now, and inject the sidebar via UI field).
 */
export const CustomEditorWithCopilot: React.FC<any> = (props) => {
  return (
    <div className="custom-editor-wrapper">
      <FieldLabel label="AI Editor & Copilot" />
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
            The Rich Text editor is provided natively by Payload Lexical. 
            Use the Copilot Sidebar to generate or edit content.
          </p>
        </div>
        <div style={{ width: '300px' }}>
          <CopilotSidebar />
        </div>
      </div>
    </div>
  )
}
