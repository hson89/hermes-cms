import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'low' | 'high' | 'highest'
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ variant = 'low', children, className = '', ...props }) => {
  const variantStyles = {
    low: 'bg-surface-container-low',
    high: 'bg-surface-container-high',
    highest: 'bg-surface-container-highest',
  }

  return (
    <div 
      className={`rounded-2xl p-6 transition-all duration-300 ${variantStyles[variant]} ${className}`} 
      {...props}
    >
      {children}
    </div>
  )
}
