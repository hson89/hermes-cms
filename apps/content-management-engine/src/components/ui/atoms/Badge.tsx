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

  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success-container/20 text-success border-success/20',
    danger: 'bg-error-container/20 text-error border-error/20',
    neutral: 'bg-surface-variant text-on-surface-variant border-outline-variant/15',
    gold: 'bg-tertiary-container/20 text-tertiary border-tertiary/20',
    // Standard Tailwind system color fallbacks compiled statically:
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    red: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
    pink: 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
    gray: 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400',
  }

  const colorClass = colorClasses[color] || colorClasses.primary

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-label font-bold border ${sizeClasses[size]} ${colorClass} ${className}`}>
      {icon && <span className="material-symbols-outlined !text-[1.2em]">{icon}</span>}
      {children}
    </span>
  )
}
