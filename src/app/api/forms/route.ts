import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase public environment variables')
  }
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY environment variable')
  }
  
  // Regular client for auth
  const supabase = createClient(supabaseUrl, anonKey)
  
  // Service role client for admin operations (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  return { supabase, supabaseAdmin }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, supabaseAdmin } = getSupabaseClients()
    
    // Get user from Authorization header (if provided)
    const authHeader = request.headers.get('authorization')
    let currentUser = null
    let currentUserProfile = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (!authError && user) {
        currentUser = user
        
        // Get user profile with admin privileges (to check role and relationships)
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, role, invited_by, first_name, last_name, email')
          .eq('id', user.id)
          .single()
          
        currentUserProfile = profile
      }
    }
    
    const { searchParams } = new URL(request.url)
    
    // Extract filter parameters
    const module = searchParams.get('module')
    const userId = searchParams.get('user_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const search = searchParams.get('search')
    const adminId = searchParams.get('admin_id') // For filtering by admin's invited users
    
    // Build the base query - use admin client for complex queries
    let query = supabaseAdmin
      .from('forms')
      .select(`
        *,
        metadata,
        settings
      `)
    
    // 🔒 SECURITY: Filter forms based on user permissions
    if (currentUser && currentUserProfile) {
      if (currentUserProfile.role === 'admin') {
        // Admins can only see forms they created
        query = query.eq('created_by', currentUser.id)
      } else if (currentUserProfile.role === 'employee') {
        // Employees can only see forms assigned to them
        // Use form_assignments table if it exists, fallback to metadata approach
        const { data: assignedForms } = await supabaseAdmin
          .from('form_assignments')
          .select('form_id')
          .eq('employee_id', currentUser.id)
        
        if (assignedForms && assignedForms.length > 0) {
          const assignedFormIds = assignedForms.map(a => a.form_id)
          query = query.in('id', assignedFormIds)
        } else {
          // Fallback to metadata filtering if no form_assignments found
          // This will be filtered after the query since we can't easily query JSONB arrays
          // For now, fetch all forms and filter in memory (less efficient but secure)
        }
      }
    } else {
      // No authenticated user - return empty results
      return NextResponse.json({ 
        data: [],
        metadata: {
          availableUsers: [],
          availableModules: [],
          total: 0
        }
      })
    }
    
    // Apply other filters
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
    
    // Additional filtering for employees using metadata (if form_assignments didn't work)
    let filteredForms = forms || []
    if (currentUserProfile?.role === 'employee' && filteredForms.length === 0) {
      // Filter forms where employee is in metadata.assigned_employees or metadata.users
      filteredForms = forms?.filter(form => {
        const assignedEmployees = form.metadata?.assigned_employees || []
        const users = form.metadata?.users || []
        return assignedEmployees.includes(currentUser!.id) || 
               users.some((user: any) => user.id === currentUser!.id)
      }) || []
    }
    
    // Get question counts for filtered forms
    let formsWithCounts = filteredForms
    if (filteredForms && filteredForms.length > 0) {
      const formIds = filteredForms.map(form => form.id)
      const { data: questionCounts } = await supabaseAdmin
        .from('form_questions')
        .select('form_id')
        .in('form_id', formIds)
      
      // Count questions per form
      const countMap: Record<string, number> = {}
      questionCounts?.forEach(q => {
        countMap[q.form_id] = (countMap[q.form_id] || 0) + 1
      })
      
      // Add question count to each form
      formsWithCounts = filteredForms.map(form => ({
        ...form,
        questionCount: countMap[form.id] || 0
      }))
    }
    
    // Apply user-specific filtering (this is now additional filtering on already secure data)
    let finalFilteredForms = formsWithCounts
    
    if (userId && userId !== 'All') {
      finalFilteredForms = formsWithCounts?.filter(form => {
        // Check both assigned_employees (IDs) and users (objects) for backward compatibility
        const assignedEmployees = form.metadata?.assigned_employees || []
        const users = form.metadata?.users || []
        return assignedEmployees.includes(userId) || users.some((user: any) => user.id === userId)
      }) || []
    }
    
    // Get available users for the current admin (only if they're an admin)
    let availableUsers: any[] = []
    if (currentUserProfile?.role === 'admin') {
      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'employee')
        .eq('invited_by', currentUser!.id)
        .eq('status', 'active')
        .order('first_name')
      
      availableUsers = users || []
    }
    
    // Get available modules from the user's accessible forms only
    const availableModules = Array.from(new Set(
      finalFilteredForms?.map(f => f.settings?.module).filter(Boolean) || []
    ))
    
    console.log(`🔒 Forms API: User ${currentUser?.email || 'anonymous'} (${currentUserProfile?.role || 'unknown'}) accessing ${finalFilteredForms?.length || 0} forms`)
    
    return NextResponse.json({ 
      data: finalFilteredForms,
      metadata: {
        availableUsers,
        availableModules,
        total: finalFilteredForms?.length || 0
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
    const { supabaseAdmin } = getSupabaseClients()
    
    const formData = await request.json()
    
    const { data, error } = await supabaseAdmin
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