import React from 'react'

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
}

export const Heading: React.FC<HeadingProps> = ({ level = 1, children, className = '', ...props }) => {
  const Tag = `h${level}` as any

  
  const baseStyles = 'font-headline font-bold text-on-surface tracking-tight leading-tight'
  
  const sizeStyles = {
    1: 'text-5xl md:text-6xl',
    2: 'text-4xl md:text-5xl',
    3: 'text-3xl md:text-4xl',
    4: 'text-2xl md:text-3xl',
    5: 'text-xl md:text-2xl',
    6: 'text-lg md:text-xl',
  }

  return (
    <Tag className={`${baseStyles} ${sizeStyles[level]} ${className}`} {...props}>
      {children}
    </Tag>
  )
}
