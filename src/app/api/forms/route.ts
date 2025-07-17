import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    
    const { searchParams } = new URL(request.url)
    
    // Extract filter parameters
    const module = searchParams.get('module')
    const userId = searchParams.get('user_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')
    const adminId = searchParams.get('admin_id') // For filtering by admin's invited users
    
    // Build the base query
    let query = supabase
      .from('forms')
      .select(`
        *,
        metadata,
        settings
      `)
    
    // Apply filters
    if (module && module !== 'All') {
      query = query.eq('settings->>module', module)
    }
    
    if (dateFrom) {
      query = query.gte('settings->>due_date', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('settings->>due_date', dateTo)
    }
    
    if (search) {
      query = query.ilike('description', `%${search}%`)
    }
    
    // Order by creation date
    query = query.order('created_at', { ascending: false })
    
    const { data: forms, error } = await query
    
    if (error) {
      console.error('Forms query error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Get question counts for all forms
    let formsWithCounts = forms || []
    if (forms && forms.length > 0) {
      const formIds = forms.map(form => form.id)
      const { data: questionCounts } = await supabase
        .from('form_questions')
        .select('form_id')
        .in('form_id', formIds)
      
      // Count questions per form
      const countMap: Record<string, number> = {}
      questionCounts?.forEach(q => {
        countMap[q.form_id] = (countMap[q.form_id] || 0) + 1
      })
      
      // Add question count to each form
      formsWithCounts = forms.map(form => ({
        ...form,
        questionCount: countMap[form.id] || 0
      }))
    }
    
    // If filtering by user, we need to filter forms that include specific users
    let filteredForms = formsWithCounts
    
    if (userId && userId !== 'All') {
      filteredForms = formsWithCounts?.filter(form => {
        // Check both assigned_employees (IDs) and users (objects) for backward compatibility
        const assignedEmployees = form.metadata?.assigned_employees || []
        const users = form.metadata?.users || []
        return assignedEmployees.includes(userId) || users.some((user: any) => user.id === userId)
      }) || []
    }
    
    // If admin_id is provided, also return available users for that admin
    let availableUsers: any[] = []
    if (adminId) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'employee')
        .eq('invited_by', adminId)
        .eq('status', 'active')
        .order('first_name')
      
      availableUsers = users || []
    }
    
    // Get available modules from existing forms
    const { data: moduleData } = await supabase
      .from('forms')
      .select('settings')
      .not('settings->>module', 'is', null)
    
    const availableModules = Array.from(new Set(
      moduleData?.map(f => f.settings?.module).filter(Boolean) || []
    ))
    
    return NextResponse.json({ 
      data: filteredForms,
      metadata: {
        availableUsers,
        availableModules,
        total: filteredForms?.length || 0
      }
    })
  } catch (error) {
    console.error('Forms API error:', error)
    if (error instanceof Error && error.message.includes('Missing Supabase')) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }
    return NextResponse.json({ 
      error: 'Failed to get forms' 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    
    const formData = await request.json()
    
    const { data, error } = await supabase
      .from('forms')
      .insert(formData)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Forms POST API error:', error)
    if (error instanceof Error && error.message.includes('Missing Supabase')) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }
    return NextResponse.json({ 
      error: 'Failed to create form' 
    }, { status: 500 })
  }
} 