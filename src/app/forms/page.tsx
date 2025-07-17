"use client"

import { useState, useEffect } from 'react'
import { useFilteredForms, FormFilters } from '@/hooks/useFilteredForms'
import { useSortableColumn } from '@/hooks/useSortableColumn'

const formsColumns = [
  'Description', 'Site', 'Module', 'Responsible', 'Due'
]

export default function FormsPage() {
  const [filters, setFilters] = useState<FormFilters>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { forms, loading, error, availableUsers, availableModules, total } = useFilteredForms(filters)

  // Due date sorting
  const dueDateSort = useSortableColumn(
    forms,
    (form) => form.settings?.due_date
  )

  // Pagination logic - use sorted data
  const totalPages = Math.ceil(dueDateSort.sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedForms = dueDateSort.sortedData.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const handleFilterChange = (key: keyof FormFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'All' ? undefined : value
    }))
  }

  const formatUserName = (user: any) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    })
  }

  const getResponsibleUsers = (form: any) => {
    const users = form.metadata?.users || []
    if (users.length === 0) return 'No users assigned'
    if (users.length === 1) return users[0].name || users[0].email
    return `${users[0].name || users[0].email} +${users.length - 1} more`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold font-inter">Forms</h2>
        <span className="bg-[#F2F2F2] text-[#272937] text-xs font-medium font-inter rounded px-3 py-1">
          Total {total} forms
        </span>
      </div>
      
      {/* Filter controls */}
      <div className="flex flex-wrap justify-end gap-3 mb-4">
        {/* Module Filter */}
        <select 
          value={filters.module || 'All'}
          onChange={(e) => handleFilterChange('module', e.target.value)}
          className="w-[160px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
        >
          <option value="All">All Modules</option>
          {availableModules.map(module => (
            <option key={module} value={module}>{module}</option>
          ))}
        </select>

        {/* Persons Filter */}
        <select 
          value={filters.userId || 'All'}
          onChange={(e) => handleFilterChange('userId', e.target.value)}
          className="w-[180px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
        >
          <option value="All">All Persons</option>
          {availableUsers.map(user => (
            <option key={user.id} value={user.id}>
              {formatUserName(user)}
            </option>
          ))}
        </select>

        {/* Date From */}
        <input 
          type="date" 
          value={filters.dateFrom || ''}
          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          className="h-[36px] w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none" 
        />

        {/* Date To */}
        <input 
          type="date" 
          value={filters.dateTo || ''}
          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          className="h-[36px] w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none" 
        />

        {/* Search */}
        <input 
          type="search" 
          placeholder="Search descriptions..." 
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="h-[36px] min-w-[200px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none" 
        />
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading forms: {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm font-inter">
              <thead>
                <tr className="bg-[#F2F2F2]">
                  {formsColumns.map((col) => {
                    if (col === 'Due') {
                      return (
                        <th 
                          key={col} 
                          {...dueDateSort.getSortableHeaderProps()}
                          className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{col}</span>
                            {dueDateSort.renderSortIcon()}
                          </div>
                        </th>
                      )
                    }
                    return (
                      <th key={col} className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">{col}</th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedForms.length === 0 ? (
                  <tr>
                    <td colSpan={formsColumns.length} className="px-4 py-8 text-center text-gray-500">
                      No forms found
                    </td>
                  </tr>
                ) : (
                  paginatedForms.map((form, i) => (
                    <tr key={form.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                        {form.description || 'No description'}
                      </td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                        {form.title || '-'}
                      </td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                        {form.settings?.module || '-'}
                      </td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                        {getResponsibleUsers(form)}
                      </td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                        {formatDate(form.settings?.due_date || '')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {forms.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, forms.length)} of {forms.length} forms
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === page
                          ? 'bg-[#FF6551] text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 