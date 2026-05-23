"use client"

import React from 'react'

export interface FilterOption<T extends string> {
  value: T
  label: string
}

interface FilterChipsProps<T extends string> {
  options: FilterOption<T>[]
  selectedValue: T
  onChange: (value: T) => void
  className?: string
}

export const FilterChips = <T extends string>({
  options,
  selectedValue,
  onChange,
  className = '',
}: FilterChipsProps<T>) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((option) => {
        const isActive = selectedValue === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              font-label text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all duration-200 cursor-pointer border-none
              ${isActive 
                ? 'bg-primary text-on-primary font-bold' 
                : 'bg-surface-container-low text-outline hover:bg-surface-container-high hover:text-on-surface'
              }
            `}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
