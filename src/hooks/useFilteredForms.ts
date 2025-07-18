import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type FormFilters = {
  module?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  adminId?: string
}

export type FormData = {
  id: string
  title: string
  description: string
  metadata?: {
    users?: Array<{ id: string; name: string; email: string }>
    assigned_employees?: string[]
    assigned_employee_count?: number
  }
  settings?: {
    module?: string
    due_date?: string
  }
  created_at: string
  questionCount?: number
}

export type UseFilteredFormsResult = {
  forms: FormData[]
  loading: boolean
  error: string | null
  availableUsers: Array<{ id: string; first_name?: string; last_name?: string; email: string }>
  availableModules: string[]
  total: number
  refetch: () => void
}

export const useFilteredForms = (filters: FormFilters = {}): UseFilteredFormsResult => {
  const [forms, setForms] = useState<FormData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [availableModules, setAvailableModules] = useState<string[]>([])
  const [total, setTotal] = useState(0)

  const fetchForms = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        setForms([])
        setAvailableUsers([])
        setAvailableModules([])
        setTotal(0)
        return
      }

      // Build query parameters
      const params = new URLSearchParams()
      
      if (filters.module) params.append('module', filters.module)
      if (filters.userId) params.append('user_id', filters.userId)
      if (filters.dateFrom) params.append('date_from', filters.dateFrom)
      if (filters.dateTo) params.append('date_to', filters.dateTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.adminId) params.append('admin_id', filters.adminId)

      const response = await fetch(`/api/forms?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      setForms(result.data || [])
      setAvailableUsers(result.metadata?.availableUsers || [])
      setAvailableModules(result.metadata?.availableModules || [])
      setTotal(result.metadata?.total || 0)

    } catch (err) {
      console.error('Error fetching forms:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch forms')
    } finally {
      setLoading(false)
    }
  }

  // Fetch forms when filters change
  useEffect(() => {
    fetchForms()
  }, [
    filters.module,
    filters.userId,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
    filters.adminId
  ])

  return {
    forms,
    loading,
    error,
    availableUsers,
    availableModules,
    total,
    refetch: fetchForms,
  }
} 