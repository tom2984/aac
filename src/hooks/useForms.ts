import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useForms() {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.from('forms').select('*').order('created_at', { ascending: false })
      if (error) setError(error.message)
      setForms(data || [])
      setLoading(false)
    }
    fetchForms()
  }, [])

  return { forms, loading, error }
} 