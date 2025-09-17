import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering to allow request.headers access
export const dynamic = 'force-dynamic'

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

// Map database answer keys to analytics keys
function mapAnswerValue(answerObj: any, reasonKey: string): number {
  if (!answerObj || typeof answerObj !== 'object') return 0
  
  // Try different key variations for each reason type
  const keyMappings: Record<string, string[]> = {
    weather: ['weather', 'Weather', 'WEATHER'],
    technical: ['technical', 'Technical', 'Technical problems', 'technical problems', 'TECHNICAL'],
    other: ['other', 'Other', 'Other reasons', 'other reasons', 'OTHER'],
    client: ['client', 'Client', 'CLIENT'],
    materials: ['materials', 'Materials', 'Materials not arriving', 'materials not arriving', 'supplier', 'Supplier', 'MATERIALS'],
    drying: ['drying', 'Drying', 'Weather drying up', 'weather drying up', 'DRYING'],
    leaving: ['leaving', 'Leaving', 'Leaving site', 'leaving site', 'LEAVING']
  }
  
  const possibleKeys = keyMappings[reasonKey] || []
  
  for (const key of possibleKeys) {
    if (answerObj[key] !== undefined && answerObj[key] !== null && answerObj[key] !== '') {
      const value = Number(answerObj[key])
      if (!isNaN(value)) {
        return value
      }
    }
  }
  
  return 0
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, supabaseAdmin } = getSupabaseClients()
    
    // Get user from Authorization header
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

    // Require authentication for analytics data
    if (!currentUser || !currentUserProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 🔒 SECURITY: Only admins and managers can access analytics data
    if (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'manager') {
      return NextResponse.json({ error: 'Admin or manager access required' }, { status: 403 })
    }

    // Get filter parameters from URL
    const { searchParams } = new URL(request.url)
    const userFilter = searchParams.get('user_filter') // Filter by specific respondent
    
    // Build the base query for forms - filter by user permissions
    let formsQuery = supabaseAdmin.from('forms').select('*')
    
    // 🔒 SECURITY: Filter forms based on user permissions
    if (currentUserProfile.role === 'admin' || currentUserProfile.role === 'manager') {
      // Get team members for team-based access
      const teamMemberIds = await getTeamMemberIds(supabaseAdmin, currentUser.id, currentUserProfile.invited_by)
      
      console.log(`🔒 Analytics team access for ${currentUserProfile.role} ${currentUser.email}:`, teamMemberIds)
      
      // Admins/Managers can see analytics for forms created by anyone in their team
      formsQuery = formsQuery.in('created_by', teamMemberIds)
    } else if (currentUserProfile.role === 'employee') {
      // Employees can only see forms assigned to them
      const { data: assignedForms } = await supabaseAdmin
        .from('form_assignments')
        .select('form_id')
        .eq('employee_id', currentUser.id)
      
      if (assignedForms && assignedForms.length > 0) {
        const assignedFormIds = assignedForms.map(a => a.form_id)
        formsQuery = formsQuery.in('id', assignedFormIds)
      } else {
        // No assigned forms, return empty data
        return NextResponse.json({
          data: {
            forms: [],
            questions: [],
            responses: [],
            answers: []
          }
        })
      }
    }

    // Fetch forms and questions in parallel
    const [formsResponse, questionsResponse] = await Promise.all([
      formsQuery,
      supabaseAdmin.from('form_questions').select('id,form_id,question_type,question_text,sub_questions').eq('question_type', 'composite')
    ])

    if (formsResponse.error) {
      return NextResponse.json({ error: formsResponse.error.message }, { status: 400 })
    }
    if (questionsResponse.error) {
      return NextResponse.json({ error: questionsResponse.error.message }, { status: 400 })
    }

    const formsData = formsResponse.data || []
    const formIds = formsData.map(f => f.id)

    // Filter for days lost related questions that belong to user's forms
    const daysLostQuestions = questionsResponse.data?.filter(q => 
      formIds.includes(q.form_id) && // Only questions from user's forms
      q.question_text && (
        q.question_text.toLowerCase().includes('days lost') ||
        q.question_text.toLowerCase().includes('hours lost') ||
        q.question_text.toLowerCase().includes('weather') ||
        q.question_text.toLowerCase().includes('technical') ||
        q.question_text.toLowerCase().includes('other reasons') ||
        q.question_text.toLowerCase().includes('client') ||
        q.question_text.toLowerCase().includes('materials') ||
        q.question_text.toLowerCase().includes('supplier') ||
        q.question_text.toLowerCase().includes('drying') ||
        q.question_text.toLowerCase().includes('leaving site')
      )
    ) || []

    // Build responses query with optional user filtering
    let responsesQuery = supabaseAdmin
      .from('form_responses')
      .select('id,form_id,respondent_id,submitted_at')
      .in('form_id', formIds)

    // Apply user filter for responses (filter by who submitted the response)
    if (userFilter && userFilter !== 'All') {
      responsesQuery = responsesQuery.eq('respondent_id', userFilter)
    }

    const { data: responsesData, error: responsesError } = await responsesQuery

    if (responsesError) {
      return NextResponse.json({ error: responsesError.message }, { status: 400 })
    }

    // Get answers for user's questions only, filtered by the responses we found
    const questionIds = daysLostQuestions.map(q => q.id)
    const responseIds = responsesData?.map(r => r.id) || []
    let answersData: any[] = []
    
    if (questionIds.length > 0 && responseIds.length > 0) {
      const { data: answers, error: answersError } = await supabaseAdmin
        .from('form_response_answers')
        .select('response_id,question_id,answer')
        .in('question_id', questionIds)
        .in('response_id', responseIds) // Only get answers from filtered responses

      if (answersError) {
        return NextResponse.json({ error: answersError.message }, { status: 400 })
      }
      
      answersData = answers || []
    }

    // Transform answers to use the correct key mapping
    const transformedAnswers = answersData.map(answer => {
      const originalAnswer = answer.answer || {}
      const transformedAnswer: Record<string, any> = {}
      
      // Map the keys to the expected format
      const reasons = ['weather', 'technical', 'other']
      reasons.forEach(reasonKey => {
        transformedAnswer[reasonKey] = mapAnswerValue(originalAnswer, reasonKey)
      })
      
      return {
        ...answer,
        answer: transformedAnswer
      }
    })

    console.log(`🔒 Analytics API: User ${currentUser.email} (${currentUserProfile.role}) accessing analytics for ${formsData.length} forms`)
    console.log(`📊 Found ${daysLostQuestions.length} days lost questions, ${responsesData?.length || 0} responses, ${transformedAnswers.length} answers`)
    if (userFilter && userFilter !== 'All') {
      console.log(`🎯 Filtered by respondent: ${userFilter}`)
    }

    return NextResponse.json({
      data: {
        forms: formsData,
        questions: daysLostQuestions,
        responses: responsesData || [],
        answers: transformedAnswers
      }
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    if (error instanceof Error && error.message.includes('Missing Supabase')) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data' 
    }, { status: 500 })
  }
} 