import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase public environment variables')
  }
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
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

export async function POST(request: Request) {
  try {
    const { supabase, supabaseAdmin } = getSupabaseClients()
    
    const { emails, role = 'employee' } = await request.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Emails array is required' }, { status: 400 })
    }

    // Get user from Authorization header using anon client
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: User not authenticated' }, { status: 401 })
    }

    // Validate that the current user is an admin using service role client (bypasses RLS)
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile || currentUserProfile.role !== 'admin') {
      console.log('❌ Admin check failed:', { profileError, currentUserProfile, userId: user.id })
      return NextResponse.json({ error: 'Unauthorized: Only admins can send invitations' }, { status: 403 })
    }

    console.log('✅ Admin verification successful for user:', user.id)

    const results = []

    for (const email of emails) {
      try {
        // Generate secure token using the database function (service role)
        const { data: tokenData, error: tokenError } = await supabaseAdmin
          .rpc('generate_invite_token')

        if (tokenError || !tokenData) {
          throw new Error('Failed to generate invite token')
        }

        const token = tokenData

        // Check if there's already a pending invitation for this email (service role)
        const { data: existingInvite, error: checkError } = await supabaseAdmin
          .from('invite_tokens')
          .select('id, status')
          .eq('email', email)
          .eq('status', 'pending')
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error('Error checking existing invitations')
        }

        if (existingInvite) {
          results.push({
            email,
            status: 'skipped',
            message: 'Invitation already pending for this email'
          })
          continue
        }

        // Create invite token record (service role)
        const { data: inviteRecord, error: inviteError } = await supabaseAdmin
          .from('invite_tokens')
          .insert({
            token,
            email,
            invited_by: user.id, // Use the authenticated user's ID
            role,
            status: 'pending'
          })
          .select()
          .single()

        if (inviteError) {
          throw new Error('Failed to create invite record')
        }

        // Create the invitation link with proper domain
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                       process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                       'http://localhost:3000'
        const inviteLink = `${baseUrl}/accept-invite?token=${token}`

        // Here you would normally send an email using:
        // - Supabase Edge Functions with email service
        // - External email service like Resend, SendGrid, etc.
        // - Custom email integration

        // For now, we'll just return the link for manual sending
        results.push({
          email,
          status: 'success',
          inviteLink,
          token,
          message: 'Invitation created successfully'
        })

      } catch (error) {
        results.push({
          email,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    // Count successful invitations
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    return NextResponse.json({
      success: true,
      summary: {
        total: emails.length,
        successful: successCount,
        errors: errorCount,
        skipped: skippedCount
      },
      results
    })

  } catch (error) {
    console.error('Invitation API error:', error)
    if (error instanceof Error && error.message.includes('Missing Supabase')) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }
    return NextResponse.json(
      { error: 'Failed to process invitations' },
      { status: 500 }
    )
  }
} 