import React from 'react'

export const FieldRenderer: React.FC<{
  field: any
  value: any
  onChange: (val: any) => void
  isDrafting?: boolean
}> = ({ field, value, onChange, isDrafting }) => {
  const commonClasses = "w-full bg-surface-container-lowest border-none rounded-xl p-5 font-body text-sm focus:outline-none transition-all ghost-border ghost-border-focus"
  
  const isTitle = field.name === 'title'
  const isSlug = field.name === 'slug'
  const isBody = field.type === 'richText' || field.name === 'body'
  const isMedia = field.type === 'upload'

  if (isTitle) {
    return (
      <h1 
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onChange(e.currentTarget.innerText)}
        className={`font-headline text-5xl text-on-surface font-bold leading-tight outline-none border-none bg-transparent m-0 transition-all ${isDrafting ? 'typing-cursor opacity-70' : ''}`}
      >
        {value || 'Untitled Entry'}
      </h1>
    )
  }

  if (isSlug) {
    return (
      <div className="relative group">
        <input 
          type="text" 
          value={value || ''} 
          readOnly
          className="w-full bg-transparent border-0 border-b border-outline-variant/30 px-0 py-2 font-body text-on-surface focus:ring-0 focus:border-primary transition-colors cursor-default"
        />
      </div>
    )
  }

  if (isMedia) {
    return (
      <div className="w-full h-80 rounded-xl bg-surface-container-high border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center relative overflow-hidden transition-colors cursor-pointer group hover:border-primary/50">
        {isDrafting ? (
          <div className="absolute inset-0 bg-surface-container-lowest/40 backdrop-blur-sm flex flex-col items-center justify-center z-10 pulse-subtle">
            <div className="w-12 h-12 rounded-full bg-primary-container text-primary flex items-center justify-center mb-3 shadow-lg">
              <span className="material-symbols-outlined !text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <span className="font-label text-sm text-primary font-medium tracking-wide">AI Generating Image...</span>
            <span className="text-xs text-on-surface-variant mt-1 font-body">"Abstract visualization of cognitive computing..."</span>
          </div>
        ) : value ? (
          <div className="relative w-full h-full">
            <img 
              src={typeof value === 'string' ? value : (value.url || '')} 
              alt="AI Generated" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button className="bg-white text-on-surface px-4 py-2 rounded-lg font-label text-xs font-bold shadow-sm border-none cursor-pointer">
                Regenerate with AI
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">image</span>
            <span className="font-body text-sm text-outline-variant">Image Placeholder</span>
          </div>
        )}
      </div>
    )
  }

  if (isBody) {
    return (
      <div className={`prose max-w-none font-body text-on-surface leading-relaxed flex flex-col gap-6 text-lg relative p-6 rounded-xl transition-all ${isDrafting ? 'bg-primary-fixed/30 border-l-2 border-primary -ml-4' : ''}`}>
        {isDrafting && (
          <div className="absolute -left-2 top-2 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </div>
        )}
        <div className={isDrafting ? 'typing-cursor' : ''} dangerouslySetInnerHTML={{ __html: value || '' }} />
      </div>
    )
  }

  switch (field.type) {
    case 'text':
      return (
        <input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        />
      )
    case 'textarea':
      return (
        <textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className={`${commonClasses} min-h-[120px] resize-y`}
        />
      )
    default:
      return (
        <div className={`${commonClasses} bg-surface-container-low italic text-on-surface-variant/40`}>
          Field type "{field.type}" renderer not implemented yet.
        </div>
      )
  }
}
