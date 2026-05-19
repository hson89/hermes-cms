'use client'

import React from 'react'

interface DraftingTemplateProps {
  chatPanel: React.ReactNode
  editorPanel?: React.ReactNode
  schemaPresent: boolean
  welcomeTitle?: string
  welcomeSubtitle?: string
}

export const DraftingTemplate: React.FC<DraftingTemplateProps> = ({
  chatPanel,
  editorPanel,
  schemaPresent,
  welcomeTitle = "How can I help you today?",
  welcomeSubtitle = "Describe the content you want to create, and I'll handle the rest."
}) => {
  return (
    <div className="flex w-full h-full bg-background overflow-hidden transition-all duration-700">
      {/* Left Panel: Conversational AI Agent interface */}
      <section 
        className={`
          flex flex-col h-full z-10 relative transition-all duration-700 ease-in-out
          ${!schemaPresent 
            ? 'w-full max-w-2xl mx-auto border-none' 
            : 'w-1/3 min-w-[400px] border-r border-surface-variant/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)]'
          }
          bg-surface
        `}
      >
        <div className={!schemaPresent ? 'px-8 pt-12 pb-6 animate-in fade-in slide-in-from-top-4 duration-1000' : 'hidden'}>
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">{welcomeTitle}</h2>
          <p className="font-body text-on-surface-variant">{welcomeSubtitle}</p>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {chatPanel}
        </div>
      </section>

      {/* Right Panel: Structured Content Editor */}
      {schemaPresent && editorPanel && (
        <section className="flex-1 bg-surface-container-lowest overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-700 ease-out">
          <div className="max-w-4xl mx-auto px-12 py-16">
            {editorPanel}
          </div>
        </section>
      )}
    </div>
  )
}
