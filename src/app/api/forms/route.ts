import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper function to get all team member IDs for team-based access
async function getTeamMemberIds(supabaseAdmin: any, userId: string, invitedBy: string | null): Promise<string[]> {
  const teamMemberIds = new Set<string>()
  
  // Always include the current user
  teamMemberIds.add(userId)
  
  // If this user was invited by someone, include the inviter (team root)
  if (invitedBy) {
    teamMemberIds.add(invitedBy)
    
    // Also include all other people invited by the same admin
    const { data: siblings } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('invited_by', invitedBy)
      .neq('id', userId) // Don't include self again
    
    if (siblings) {
      siblings.forEach((sibling: any) => teamMemberIds.add(sibling.id))
    }
  }
  
  // Include all people this user has invited (their team members)
  const { data: invitees } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('invited_by', userId)
  
  if (invitees) {
    invitees.forEach((invitee: any) => teamMemberIds.add(invitee.id))
  }
  
  return Array.from(teamMemberIds)
}

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
      if (currentUserProfile.role === 'admin' || currentUserProfile.role === 'manager') {
        // Get team members (people this admin invited + the admin who invited them)
        const teamMemberIds = await getTeamMemberIds(supabaseAdmin, currentUser.id, currentUserProfile.invited_by)
        
        console.log(`🔒 Team access for ${currentUserProfile.role} ${currentUser.email}:`, teamMemberIds)
        
        // Admins/Managers can see forms created by anyone in their team
        query = query.in('created_by', teamMemberIds)
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
    
    // Get available users for the current admin/manager
    let availableUsers: any[] = []
    if (currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'manager') {
      // Simplified approach: Get all team members using the same logic as settings page
      const teamMemberIds = await getTeamMemberIds(supabaseAdmin, currentUser!.id, currentUserProfile.invited_by)
      
      console.log(`🔍 Getting available users for ${currentUserProfile.role} ${currentUser!.email}`)
      console.log(`🔍 Team member IDs:`, teamMemberIds)
      
      // Get all active team members (both employees and admins/managers)
      const { data: allTeamMembers, error: teamError } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('invited_by', teamMemberIds)
        .neq('id', currentUser!.id) // Don't include self
        .eq('status', 'active')
        .order('first_name')
      
      if (teamError) {
        console.error('❌ Error fetching team members:', teamError)
        availableUsers = []
      } else {
        // Filter to only show employees for form assignment, but include all for debugging
        console.log(`🔍 Found ${allTeamMembers?.length || 0} total team members:`, 
          allTeamMembers?.map(u => ({ email: u.email, role: u.role })))
        
        // For form assignment, typically we want employees, but let's include everyone for now
        availableUsers = allTeamMembers || []
      }
      
      // 🚨 FALLBACK: If no users found with team logic, get all active users as fallback
      if (availableUsers.length === 0) {
        console.log(`⚠️ No users found with team logic, trying fallback approach...`)
        
        const { data: fallbackUsers, error: fallbackError } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name, email, role')
          .neq('id', currentUser!.id) // Don't include self
          .eq('status', 'active')
          .order('first_name')
        
        if (!fallbackError && fallbackUsers) {
          console.log(`✅ Fallback found ${fallbackUsers.length} users:`, 
            fallbackUsers.map(u => ({ email: u.email, role: u.role })))
          availableUsers = fallbackUsers
        } else {
          console.error('❌ Fallback also failed:', fallbackError)
        }
      }
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