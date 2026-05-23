import React from 'react'

interface GlassMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const GlassMenu: React.FC<GlassMenuProps> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 
        bg-surface/80 backdrop-blur-[20px] 
        rounded-full px-6 py-3 
        modal-shadow border border-outline-variant/15
        flex items-center gap-4 z-50
        transition-all duration-500 hover:scale-[1.02]
        ${className}
      `} 
      {...props}
    >
      {children}
    </div>
  )
}
