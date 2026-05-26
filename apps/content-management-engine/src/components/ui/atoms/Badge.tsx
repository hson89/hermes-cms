import React from 'react'

interface BadgeProps {
  children?: React.ReactNode
  color?: 'primary' | 'success' | 'danger' | 'neutral' | 'gold' | string
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  className?: string
  variant?: 'solid' | 'subtle' | 'outline' | string
  isNew?: boolean
  isModified?: boolean
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  color = 'primary', 
  size = 'md', 
  icon, 
  className = '',
  isNew,
  isModified
}) => {
  // If it's an AI suggestion badge
  if (isNew || isModified) {
    return (
      <button className="flex items-center gap-1 text-[10px] bg-primary-container/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary-container/20 transition-all font-label font-bold border-none cursor-pointer whitespace-nowrap">
        <span className="material-symbols-outlined !text-xs">auto_fix_high</span>
        {isNew ? 'AI SUGGESTS' : 'AI REFINED'}
      </button>
    )
  }

  // Generic Alexandria Badge
  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2.5 py-1',
    lg: 'text-[12px] px-3 py-1.5'
  }

  // Map static colors to Alexandria semantic design tokens for tenant-aware theming
  const colorMap: Record<string, string> = {
    blue: 'primary',
    green: 'success',
    emerald: 'success',
    red: 'danger',
    amber: 'gold',
    orange: 'gold',
    purple: 'primary',
    pink: 'primary',
    indigo: 'primary',
    slate: 'neutral',
    gray: 'neutral',
  }

  const resolvedColor = colorMap[color] || color

  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success-container/20 text-success border-success/20',
    danger: 'bg-error-container/20 text-error border-error/20',
    neutral: 'bg-surface-variant text-on-surface-variant border-outline-variant/15',
    gold: 'bg-tertiary-container/20 text-tertiary border-tertiary/20',
  }

  const colorClass = colorClasses[resolvedColor] || colorClasses.primary

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-label font-bold border ${sizeClasses[size]} ${colorClass} ${className}`}>
      {icon && <span className="material-symbols-outlined !text-[1.2em]">{icon}</span>}
      {children}
    </span>
  )
}
