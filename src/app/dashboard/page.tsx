"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/app/UserProvider'
import { useFilteredForms } from '@/hooks/useFilteredForms'
import FilterDrawer, { FilterOption } from '@/components/FilterDrawer'
import { useSortableColumn } from '@/hooks/useSortableColumn'

// Stats array removed - analytics hidden per user request

// const actionsColumns = [
//   'Description', 'Site', 'Module', 'Responsible', 'Priority', 'Due'
// ]
const formsColumns = [
  'Title', 'Description', 'Module', 'Due Date', 'Users', 'Questions'
]

export default function DashboardPage() {
  const router = useRouter()
  // const [actionsOpen, setActionsOpen] = useState(true)
  const [formsOpen, setFormsOpen] = useState(true)
  
  // Form filter states
  const [moduleFilter, setModuleFilter] = useState('All')
  const [personFilter, setPersonFilter] = useState('All')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // User context
  const userContext = useUser()
  const user = userContext?.user ? { id: userContext.user.id, ...userContext.profile } : null

  // Use the filtered forms hook
  const { 
    forms, 
    loading: formsLoading, 
    error: formsError, 
    availableUsers, 
    availableModules,
    total,
    refetch
  } = useFilteredForms({
    module: moduleFilter !== 'All' ? moduleFilter : undefined,
    userId: personFilter !== 'All' ? personFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
    adminId: user?.id
  })

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
  }, [moduleFilter, personFilter, dateFrom, dateTo, search])

  return (
    <div className="space-y-8">
      {/* Statistics Group - Hidden per user request */}

      {/* Actions Group - TEMPORARILY HIDDEN 
      <div className="bg-white rounded-2xl shadow p-6">
        <button
          className="flex items-center gap-2 text-lg font-semibold font-inter mb-4"
          onClick={() => setActionsOpen((o) => !o)}
          aria-expanded={actionsOpen}
        >
          <span>Actions</span>
          <span
            className={`ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-[#FF6551] transition-transform duration-200`}
            style={{ transform: actionsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            aria-hidden="true"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M4 7L8 11L12 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        {actionsOpen && (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-4">
              <div className="relative">
                <select className="w-full sm:w-[160px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none">
                  <option>Module</option>
                </select>
              </div>
              <div className="relative">
                <select className="w-full sm:w-[160px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none">
                  <option>Persons</option>
                </select>
              </div>
              <div className="relative">
                <select className="w-full sm:w-[140px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none">
                  <option>Priority</option>
                </select>
              </div>
              <input type="date" className="h-[36px] w-full sm:w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none" />
              <input type="date" className="h-[36px] w-full sm:w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none" />
              <input type="search" placeholder="Search" className="h-[36px] w-full sm:min-w-[200px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm font-inter">
                <thead>
                  <tr className="bg-[#F2F2F2]">
                    {actionsColumns.map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-medium text-gray-600">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {actionsColumns.map((col, j) => (
                        <td key={j} className="px-4 py-2 text-gray-700">-</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      */}

      {/* Forms Group */}
      <div className="bg-white rounded-2xl shadow p-6">
        <button
          className="flex items-center gap-2 text-lg font-semibold font-inter mb-4"
          onClick={() => setFormsOpen((o) => !o)}
          aria-expanded={formsOpen}
        >
          <Link href="/dashboard/forms" className="hover:text-blue-600 transition-colors">
            <span>Forms</span>
          </Link>
          <span
            className={`ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-[#FF6551] transition-transform duration-200`}
            style={{ transform: formsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            aria-hidden="true"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M4 7L8 11L12 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        {formsOpen && (
          <>
            {/* Mobile filter button */}
            <div className="sm:hidden mb-4">
              <button
                onClick={() => setFilterDrawerOpen(true)}
                className="flex items-center gap-2 w-full sm:w-auto bg-white border border-[#E5E7EB] text-gray-700 font-medium rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {(moduleFilter !== 'All' || personFilter !== 'All' || dateFrom || dateTo || search) && (
                  <span className="bg-[#FF6551] text-white text-xs rounded-full px-2 py-0.5 ml-1">
                    {[moduleFilter !== 'All', personFilter !== 'All', dateFrom, dateTo, search].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop filter controls */}
            <div className="hidden sm:flex sm:justify-end gap-3 mb-4">
              <select 
                className="w-[160px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}
              >
                <option value="All">All Modules</option>
                {availableModules.map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
              <select 
                className="w-[180px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
                value={personFilter}
                onChange={e => setPersonFilter(e.target.value)}
              >
                <option value="All">All Persons</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name && user.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user.email
                    }
                  </option>
                ))}
              </select>

              <input 
                type="date" 
                className="h-[36px] w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none" 
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
              <input 
                type="date"
                className="h-[36px] w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
              <input 
                type="search" 
                placeholder="Search" 
                className="h-[36px] min-w-[200px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm font-inter">
                <thead>
                  <tr className="bg-[#F2F2F2]">
                    <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Title</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Description</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Module</th>
                    <th 
                      {...dueDateSort.getSortableHeaderProps()}
                      className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>Due Date</span>
                        {dueDateSort.renderSortIcon()}
                      </div>
                    </th>
                    <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Users</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Questions</th>
                    <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">View</th>
                  </tr>
                </thead>
                <tbody>
                  {formsLoading && (
                    <tr><td colSpan={6} className="px-3 py-4 sm:px-4 sm:py-2 text-center">Loading...</td></tr>
                  )}
                  {formsError && (
                    <tr><td colSpan={6} className="px-3 py-4 sm:px-4 sm:py-2 text-center text-red-500">{formsError}</td></tr>
                  )}
                  {!formsLoading && !formsError && paginatedForms.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-4 sm:px-4 sm:py-2 text-center">No forms found.</td></tr>
                  )}
                  {!formsLoading && !formsError && paginatedForms.map((form) => (
                    <tr key={form.id} className="border-b last:border-0">
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                        <button
                          onClick={() => {
                            // Navigate to forms page and trigger view responses
                            router.push(`/dashboard/forms?viewResponses=${form.id}`)
                          }}
                          className="text-[#FF6551] hover:text-[#ff7a6b] hover:underline font-medium cursor-pointer text-left"
                        >
                          {form.title}
                        </button>
                      </td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.description}</td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.settings?.module || '-'}</td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.settings?.due_date || '-'}</td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                        {(() => {
                          // Check if we have user objects in metadata
                          if (Array.isArray(form.metadata?.users) && form.metadata.users.length > 0) {
                            return form.metadata.users.map((u: any) => u.name || u.email).join(', ')
                          }
                          // Fallback to assigned_employees count if available
                          if (form.metadata?.assigned_employee_count) {
                            return `${form.metadata.assigned_employee_count} employee${form.metadata.assigned_employee_count !== 1 ? 's' : ''}`
                          }
                          return '-'
                        })()}
                      </td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.questionCount}</td>
                      <td className="px-3 py-4 sm:px-4 sm:py-2">
                        <button
                          onClick={() => {
                            // Navigate to forms page and trigger view responses
                            router.push(`/dashboard/forms?viewResponses=${form.id}`)
                          }}
                          className="p-2 text-gray-400 hover:text-[#FF6551] hover:bg-red-50 rounded transition-colors inline-flex"
                          title="View Form Responses"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {!formsLoading && !formsError && forms.length > 0 && (
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

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title="Form Filters"
        filters={[
          {
            key: 'module',
            value: moduleFilter,
            onChange: setModuleFilter,
            type: 'select',
            placeholder: 'Module',
            options: [
              { value: 'All', label: 'All Modules' },
              ...availableModules.map(module => ({ value: module, label: module }))
            ]
          },
          {
            key: 'person',
            value: personFilter,
            onChange: setPersonFilter,
            type: 'select',
            placeholder: 'Person',
            options: [
              { value: 'All', label: 'All Persons' },
              ...availableUsers.map(user => ({
                value: user.id,
                label: user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user.email
              }))
            ]
          },

          {
            key: 'dateFrom',
            value: dateFrom,
            onChange: setDateFrom,
            type: 'date',
            placeholder: 'Date From'
          },
          {
            key: 'dateTo',
            value: dateTo,
            onChange: setDateTo,
            type: 'date',
            placeholder: 'Date To'
          },
          {
            key: 'search',
            value: search,
            onChange: setSearch,
            type: 'search',
            placeholder: 'Search forms...'
          }
        ]}
        onClearAll={() => {
          setModuleFilter('All')
          setPersonFilter('All')
          setDateFrom('')
          setDateTo('')
          setSearch('')
        }}
      />
    </div>
  )
} 