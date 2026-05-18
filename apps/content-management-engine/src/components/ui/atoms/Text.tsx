import React from 'react'

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'body' | 'small' | 'large'
  children: React.ReactNode
}

export const Text: React.FC<TextProps> = ({ variant = 'body', children, className = '', ...props }) => {
  const baseStyles = 'font-body text-on-surface leading-relaxed'
  
  const variantStyles = {
    body: 'text-base',
    small: 'text-sm text-on-surface-variant',
    large: 'text-lg',
  }

  return (
    <p className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </p>
  )
}
