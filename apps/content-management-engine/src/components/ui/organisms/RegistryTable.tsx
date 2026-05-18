"use client"

import React from 'react'

export interface TableColumn<T> {
  key: string
  label: string
  span: number // Grid column span (1-12)
  renderCell: (item: T) => React.ReactNode
  headerClassName?: string
}

interface RegistryTableProps<T> {
  columns: TableColumn<T>[]
  items: T[]
  loading: boolean
  skeletonCount?: number
  onRowClick?: (item: T) => void
  emptyState?: React.ReactNode
}

export const RegistryTable = <T extends { id: string | number }>({
  columns,
  items,
  loading,
  skeletonCount = 8,
  onRowClick,
  emptyState,
}: RegistryTableProps<T>) => {
  return (
    <div className="mt-6">
      {/* Tonal Table Header (Public Sans Styling) */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low text-outline font-label text-[10px] uppercase tracking-widest font-bold items-center rounded-t-2xl border-none">
        {columns.map((col) => {
          // Map span numbers dynamically to explicit classes to avoid Tailwind bundle purging
          const spanClasses: { [key: number]: string } = {
            1: 'col-span-1',
            2: 'col-span-2',
            3: 'col-span-3',
            4: 'col-span-4',
            5: 'col-span-5',
            6: 'col-span-6',
            7: 'col-span-7',
            8: 'col-span-8',
            9: 'col-span-9',
            10: 'col-span-10',
            11: 'col-span-11',
            12: 'col-span-12',
          }
          const spanClass = spanClasses[col.span] || 'col-span-1'
          return (
            <div key={col.key} className={`${spanClass} ${col.headerClassName || ''}`}>
              {col.label}
            </div>
          )
        })}
      </div>

      {/* Listing Rows Container */}
      <div className="flex flex-col gap-2.5 mt-2 lg:mt-0">
        {loading ? (
          /* High-End Skeleton Loader States */
          Array.from({ length: skeletonCount }).map((_, idx) => (
            <div 
              key={idx} 
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-5 bg-surface-container-lowest items-center rounded-2xl animate-pulse"
            >
              {columns.map((col) => {
                const spanClasses: { [key: number]: string } = {
                  1: 'lg:col-span-1',
                  2: 'lg:col-span-2',
                  3: 'lg:col-span-3',
                  4: 'lg:col-span-4',
                  5: 'lg:col-span-5',
                  6: 'lg:col-span-6',
                  7: 'lg:col-span-7',
                  8: 'lg:col-span-8',
                  9: 'lg:col-span-9',
                  10: 'lg:col-span-10',
                  11: 'lg:col-span-11',
                  12: 'lg:col-span-12',
                }
                const spanClass = spanClasses[col.span] || 'lg:col-span-1'
                return (
                  <div key={col.key} className={`col-span-1 ${spanClass}`}>
                    <div className="h-5 bg-surface-container-high rounded w-3/4" />
                  </div>
                )
              })}
            </div>
          ))
        ) : items.length === 0 ? (
          emptyState || (
            <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/20">
              <h3 className="font-headline font-bold text-lg text-on-surface">No Records Found</h3>
            </div>
          )
        ) : (
          /* Dynamic List Rows - Styled as borderless high-end cards */
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onRowClick && onRowClick(item)}
              className={`
                grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-4.5 bg-surface-container-lowest lg:bg-surface-container-lowest/70 hover:bg-surface-container-lowest items-center rounded-2xl border-l-[3px] border-transparent hover:border-primary transition-all duration-300 shadow-sm hover:shadow shadow-on-surface/5 cursor-pointer relative group
              `}
            >
              {columns.map((col) => {
                const spanClasses: { [key: number]: string } = {
                  1: 'lg:col-span-1',
                  2: 'lg:col-span-2',
                  3: 'lg:col-span-3',
                  4: 'lg:col-span-4',
                  5: 'lg:col-span-5',
                  6: 'lg:col-span-6',
                  7: 'lg:col-span-7',
                  8: 'lg:col-span-8',
                  9: 'lg:col-span-9',
                  10: 'lg:col-span-10',
                  11: 'lg:col-span-11',
                  12: 'lg:col-span-12',
                }
                const spanClass = spanClasses[col.span] || 'lg:col-span-1'
                return (
                  <div key={col.key} className={`col-span-1 ${spanClass}`}>
                    {col.renderCell(item)}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
