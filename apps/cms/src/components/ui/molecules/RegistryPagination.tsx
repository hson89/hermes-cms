"use client"

import React from 'react'
import { Icon } from '@/components/ui/atoms/Icon'

interface RegistryPaginationProps {
  page: number
  limit: number
  totalPages: number
  totalDocs: number
  onPageChange: (page: number) => void
  loading?: boolean
}

export const RegistryPagination: React.FC<RegistryPaginationProps> = ({
  page,
  limit,
  totalPages,
  totalDocs,
  onPageChange,
  loading = false,
}) => {
  if (loading || totalDocs === 0) return null

  const startDoc = Math.min((page - 1) * limit + 1, totalDocs)
  const endDoc = Math.min(page * limit, totalDocs)

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mt-10 pb-6 pt-4 border-t border-outline-variant/15 gap-4">
      {/* Metadata counts */}
      <div className="text-xs text-outline font-body">
        Showing <span className="font-semibold text-on-surface">{startDoc}</span> to{' '}
        <span className="font-semibold text-on-surface">{endDoc}</span> of{' '}
        <span className="font-semibold text-on-surface">{totalDocs}</span> active registry records.
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Back button */}
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="size-9 rounded-full bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all border-none cursor-pointer"
        >
          <Icon name="chevron_left" size={18} />
        </button>

        {/* Page number buttons */}
        {Array.from({ length: totalPages }).map((_, i) => {
          const pNum = i + 1
          const isActive = page === pNum
          return (
            <button
              key={pNum}
              type="button"
              onClick={() => onPageChange(pNum)}
              className={`
                size-9 rounded-full text-xs font-label font-bold uppercase transition-all duration-200 cursor-pointer border-none
                ${isActive 
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/10' 
                  : 'bg-surface-container text-outline hover:bg-surface-container-high hover:text-on-surface'
                }
              `}
            >
              {pNum}
            </button>
          )
        })}

        {/* Forward button */}
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-9 rounded-full bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all border-none cursor-pointer"
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </div>
  )
}
