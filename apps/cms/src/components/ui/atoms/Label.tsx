import React from 'react'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode
}

export const Label: React.FC<LabelProps> = ({ children, className = '', ...props }) => {
  return (
    <label 
      className={`font-label text-sm text-on-surface font-semibold tracking-wide uppercase ${className}`} 
      {...props}
    >
      {children}
    </label>
  )
}
