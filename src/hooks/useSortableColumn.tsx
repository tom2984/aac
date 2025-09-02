import React, { useState, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortableColumnHook {
  sortDirection: SortDirection
  toggleSort: () => void
  sortedData: any[]
  getSortableHeaderProps: () => {
    onClick: () => void
    className: string
    title: string
    style: { cursor: 'pointer', userSelect: 'none' }
  }
  renderSortIcon: () => JSX.Element
}

export function useSortableColumn<T>(
  data: T[],
  getValue: (item: T) => string | number | Date | null | undefined
): SortableColumnHook {
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const toggleSort = () => {
    setSortDirection(current => {
      if (current === null) return 'asc'
      if (current === 'asc') return 'desc'
      return null
    })
  }

  const sortedData = useMemo(() => {
    if (sortDirection === null) {
      return data
    }

    return [...data].sort((a, b) => {
      const aValue = getValue(a)
      const bValue = getValue(b)

      // Handle null/undefined values - push them to the end
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Convert to comparable values
      let aCompare: string | number | Date = aValue
      let bCompare: string | number | Date = bValue

      // Handle date strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Try to parse as dates if they look like dates
        const aDate = new Date(aValue)
        const bDate = new Date(bValue)
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          aCompare = aDate
          bCompare = bDate
        }
      }

      let comparison = 0
      if (aCompare < bCompare) {
        comparison = -1
      } else if (aCompare > bCompare) {
        comparison = 1
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, getValue, sortDirection])

  const getSortableHeaderProps = () => ({
    onClick: toggleSort,
    className: 'cursor-pointer select-none hover:bg-gray-100 transition-colors',
    title: `Click to sort ${sortDirection === null ? 'ascending' : sortDirection === 'asc' ? 'descending' : 'clear sort'}`,
    style: { cursor: 'pointer' as const, userSelect: 'none' as const }
  })

  const renderSortIcon = () => (
    <div className="flex flex-col ml-1">
      <svg 
        className={`w-3 h-3 transition-colors ${
          sortDirection === 'asc' ? 'text-[#FF6551]' : 'text-gray-400'
        }`} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
      <svg 
        className={`w-3 h-3 -mt-1 transition-colors ${
          sortDirection === 'desc' ? 'text-[#FF6551]' : 'text-gray-400'
        }`} 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  )

  return {
    sortDirection,
    toggleSort,
    sortedData,
    getSortableHeaderProps,
    renderSortIcon
  }
} 