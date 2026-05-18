"use client"

import React from 'react'
import { Icon } from '@/components/ui/atoms/Icon'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`relative min-w-[280px] lg:w-96 flex items-center rounded-2xl bg-surface-container-lowest border border-outline-variant/15 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 ${className}`}>
      <Icon name="search" size={18} className="text-outline ml-4" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none rounded-2xl py-3 px-3.5 font-body text-xs text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-0"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-outline hover:text-on-surface mr-3 p-1 rounded-full hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  )
}
