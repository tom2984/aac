import React from 'react'

export interface FilterOption {
  key: string
  value: string
  onChange: (value: string) => void
  options?: Array<{ value: string; label: string }>
  type: 'select' | 'date' | 'search'
  placeholder?: string
  className?: string
}

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  filters: FilterOption[]
  onClearAll?: () => void
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({ 
  isOpen, 
  onClose, 
  title = "Filters", 
  filters,
  onClearAll 
}) => {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const renderFilter = (filter: FilterOption) => {
    const baseInputClasses = "w-full h-[44px] rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-[14px] font-inter font-normal text-[#272937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
    
    switch (filter.type) {
      case 'select':
        return (
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className={`${baseInputClasses} pr-10`}
          >
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      
      case 'date':
        return (
          <input
            type="date"
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className={baseInputClasses}
          />
        )
      
      case 'search':
        return (
          <input
            type="search"
            placeholder={filter.placeholder || "Search..."}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className={baseInputClasses}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 font-inter">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close filters"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-6 space-y-4">
          {filters.map((filter, index) => (
            <div key={filter.key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 font-inter">
                {filter.placeholder || filter.key}
              </label>
              {renderFilter(filter)}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            {onClearAll && (
              <button
                onClick={onClearAll}
                className="flex-1 bg-white text-[#FF6551] font-semibold rounded-lg px-6 py-3 border-2 border-[#FF6551] hover:bg-[#FF6551] hover:text-white transition-colors font-inter"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className={`${onClearAll ? 'flex-1' : 'w-full'} bg-[#FF6551] text-white font-semibold rounded-lg px-6 py-3 hover:bg-[#E55A4A] transition-colors font-inter`}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilterDrawer 