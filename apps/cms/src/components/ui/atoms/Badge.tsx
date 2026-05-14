import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({ children, className = '', ...props }) => {
  return (
    <span 
      className={`inline-flex items-center rounded-full bg-tertiary px-2.5 py-0.5 text-xs font-label font-bold text-on-tertiary tracking-wider ${className}`} 
      {...props}
    >
      {children}
    </span>
  )
}
