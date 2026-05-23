import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => {
  const baseStyles = 'w-full bg-surface-container-lowest border rounded-xl px-4 py-3.5 font-body text-on-surface text-base focus:outline-none focus:ring-1 transition-all'
  
  const stateStyles = error 
    ? 'border-error focus:border-error focus:ring-error' 
    : 'border-outline-variant/15 focus:border-primary focus:ring-primary'

  return (
    <input 
      className={`${baseStyles} ${stateStyles} ${className}`} 
      {...props} 
    />
  )
}
