"use client"

import React from 'react'
import { Icon } from '@/components/ui/atoms/Icon'
import { Button } from '@/components/ui/atoms/Button'

interface RegistryHeaderProps {
  title: string
  subtitle: string
  breadcrumbs: string[]
  actionText?: string
  actionIcon?: string
  onActionClick?: () => void
  showAction?: boolean
}

export const RegistryHeader: React.FC<RegistryHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actionText,
  actionIcon = 'add',
  onActionClick,
  showAction = false,
}) => {
  const words = title.split(' ')

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 gap-6">
      <div className="space-y-1.5 w-full md:w-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-outline text-[10px] uppercase font-label tracking-widest font-bold">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span>{crumb}</span>
              {idx < breadcrumbs.length - 1 && <span className="opacity-40">/</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Animated Title */}
        <h1 className="font-headline font-bold text-4xl lg:text-5xl text-on-surface tracking-tight leading-none mt-1 flex flex-wrap">
          {words.map((word, idx) => (
            <span
              key={idx}
              className="inline-block animate-soft-blur-in opacity-0 mr-[0.25em] last:mr-0"
              style={{
                animationDelay: `${idx * 75}ms`,
              }}
            >
              {word}
            </span>
          ))}
          <span className="text-primary font-bold animate-soft-blur-in opacity-0" style={{ animationDelay: `${words.length * 75}ms` }}>.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-outline max-w-2xl mt-2 font-body leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* CTA Button */}
      {showAction && actionText && onActionClick && (
        <Button
          type="button"
          variant="primary"
          onClick={onActionClick}
          className="flex items-center gap-2 font-label font-bold text-xs uppercase tracking-widest px-6 py-3.5 flex-shrink-0"
        >
          <Icon name={actionIcon} size={16} />
          {actionText}
        </Button>
      )}
    </div>
  )
}
