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

      // Get current session for auth token with retry for token refresh
      let session = null
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (currentSession?.access_token) {
          session = currentSession
          break
        }
        
        if (sessionError) {
          console.warn('Session error, attempting token refresh:', sessionError)
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
          if (refreshedSession?.access_token) {
            session = refreshedSession
            break
          }
        }
        
        retryCount++
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms before retry
        }
      }

      if (!session?.access_token) {
        console.warn('No valid session after retries, user may need to re-login')
        setError('Authentication session expired. Please refresh the page.')
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

  // Set up real-time subscription for form updates
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const subscription = supabase
        .channel('forms-updates')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'forms'
          }, 
          (payload) => {
            console.log('🔄 New form created, refreshing list')
            fetchForms() // Refresh the entire list to respect permissions
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public', 
            table: 'forms'
          },
          (payload) => {
            console.log('🔄 Form updated, refreshing list')
            fetchForms() // Refresh the entire list to respect permissions
          }
        )
        .on('postgres_changes',
          {
            event: 'DELETE',
            schema: 'public', 
            table: 'forms'
          },
          (payload) => {
            console.log('🔄 Form deleted, refreshing list')
            fetchForms() // Refresh the entire list to respect permissions
          }
        )
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public', 
            table: 'form_responses'
          },
          (payload) => {
            console.log('🔄 New form response submitted, refreshing list')
            fetchForms() // Refresh to update form status counts
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }

    setupSubscription()
  }, [])

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