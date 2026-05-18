import React from 'react'
import { Icon } from '@/components/ui/atoms/Icon'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode
  variant?: 'solid' | 'subtle' | 'outline'
  color?: 'primary' | 'tertiary' | 'success' | 'danger' | 'warning' | 'neutral' | 'gold'
  size?: 'sm' | 'md'
  icon?: string
}

const colorClassMap: Record<string, { bg: string; text: string; border: string }> = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/10'
  },
  tertiary: {
    bg: 'bg-tertiary/10',
    text: 'text-tertiary dark:text-tertiary-fixed-dim',
    border: 'border-tertiary/10'
  },
  success: {
    bg: 'bg-green-500/10',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-500/10'
  },
  danger: {
    bg: 'bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-500/10'
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/10'
  },
  neutral: {
    bg: 'bg-neutral-500/10',
    text: 'text-neutral-600 dark:text-neutral-300',
    border: 'border-neutral-500/10'
  },
  gold: {
    bg: 'bg-tertiary/10',
    text: 'text-tertiary dark:text-tertiary-fixed-dim',
    border: 'border-tertiary/15'
  }
}

const getVariantClasses = (variant: 'solid' | 'subtle' | 'outline', colorKey: string) => {
  const conf = colorClassMap[colorKey] || colorClassMap.neutral
  if (variant === 'solid') {
    if (colorKey === 'primary') return 'bg-primary text-on-primary border border-transparent'
    if (colorKey === 'tertiary') return 'bg-tertiary text-on-tertiary border border-transparent'
    if (colorKey === 'success') return 'bg-green-600 text-white border border-transparent'
    if (colorKey === 'danger') return 'bg-red-600 text-white border border-transparent'
    if (colorKey === 'warning') return 'bg-amber-600 text-black border border-transparent'
    if (colorKey === 'gold') return 'bg-tertiary text-on-tertiary border border-transparent'
    return 'bg-neutral-500 text-white border border-transparent'
  }
  if (variant === 'outline') {
    return `bg-transparent ${conf.text} border ${conf.border.replace('/10', '').replace('/15', '')}`
  }
  // subtle
  return `${conf.bg} ${conf.text} border ${conf.border}`
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'subtle',
  color,
  size = 'md',
  icon,
  className = '', 
  ...props 
}) => {
  if (!color) {
    return (
      <span 
        className={`inline-flex items-center rounded-full bg-tertiary px-2.5 py-0.5 text-xs font-label font-bold text-on-tertiary tracking-wider ${className}`} 
        {...props}
      >
        {children}
      </span>
    )
  }

  const baseClasses = 'inline-flex items-center gap-1 rounded-full font-label font-bold uppercase tracking-wider transition-colors'
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[10px]'
  const variantClasses = getVariantClasses(variant, color)

  return (
    <span 
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`} 
      {...props}
    >
      {icon && (
        <Icon 
          name={icon} 
          size={size === 'sm' ? 10 : 11} 
          filled 
          className="flex-shrink-0"
        />
      )}
      {children}
    </span>
  )
}
