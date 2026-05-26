import React from 'react'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * Standard layout containment component for Alexandria view structures.
 * Enforces unified margins, max-width bounds, and responsive padding values.
 */
export const Container: React.FC<ContainerProps> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`w-full max-w-[1600px] mx-auto px-6 py-6 lg:px-10 lg:py-8 ${className}`} 
      {...props}
    >
      {children}
    </div>
  )
}
