import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  isLoading, 
  children, 
  className = '', 
  disabled, 
  ...props 
}) => {
  const baseStyles = 'font-label font-bold tracking-wide rounded-full py-3.5 px-6 transition-all duration-200 text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
  
  const variantStyles = {
    primary: 'btn-primary-gradient hover:scale-[1.02] active:scale-[0.98]',
    secondary: 'bg-surface-container-high text-primary hover:bg-surface-container-highest active:bg-surface-container',
    tertiary: 'bg-transparent text-primary hover:underline px-2 py-1',
  }

  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-outlined animate-spin text-[20px]">
          progress_activity
        </span>
      ) : null}
      {children}
    </button>
  )
}
