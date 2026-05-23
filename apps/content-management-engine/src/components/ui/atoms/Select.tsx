import React from 'react'
import { Icon } from './Icon'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select: React.FC<SelectProps> = ({ error, className = '', children, ...props }) => {
  const baseStyles = 'w-full bg-surface-container-lowest border rounded-xl pl-4 pr-10 py-3.5 font-body text-on-surface text-base focus:outline-none focus:ring-1 transition-all cursor-pointer appearance-none bg-none'
  
  const stateStyles = error 
    ? 'border-error focus:border-error focus:ring-error' 
    : 'border-outline-variant/15 focus:border-primary focus:ring-primary'

  return (
    <div className="relative w-full flex items-center">
      <select 
        className={`${baseStyles} ${stateStyles} ${className}`} 
        {...props}
      >
        {children}
      </select>
      <Icon 
        name="expand_more" 
        size={20} 
        className="absolute right-4 pointer-events-none text-outline-variant"
      />
    </div>
  )
}
