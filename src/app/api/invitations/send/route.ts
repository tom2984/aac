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

export async function POST(request: Request) {
  try {
    const { supabase, supabaseAdmin } = getSupabaseClients()
    
    // Test Make.com webhook configuration
    console.log('🔧 Make.com Employee Webhook:', !!process.env.MAKE_EMPLOYEE_WEBHOOK_URL)
    console.log('🔧 Make.com Admin Webhook:', !!process.env.MAKE_ADMIN_WEBHOOK_URL)
    
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
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile || currentUserProfile.role !== 'admin') {
      console.log('❌ Admin check failed:', { profileError, currentUserProfile, userId: user.id })
      return NextResponse.json({ error: 'Unauthorized: Only admins can send invitations' }, { status: 403 })
    }

    console.log('✅ Admin verification successful for user:', user.id)

    const results = []
    const adminName = `${currentUserProfile.first_name || 'Admin'} ${currentUserProfile.last_name || ''}`.trim()

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

        // Send email using Make.com
        try {
          console.log('📧 Sending invitation email to:', email, 'with role:', role)
          
          // Determine webhook URL based on role
          const webhookUrl = role === 'employee' 
            ? process.env.MAKE_EMPLOYEE_WEBHOOK_URL 
            : process.env.MAKE_ADMIN_WEBHOOK_URL;
            
          console.log('🔧 Selected webhook URL for role', role, ':', webhookUrl ? 'Found' : 'Missing')
          
          if (!webhookUrl) {
            throw new Error(`Missing webhook URL for role: ${role}`)
          }
          
          // Prepare data for Make.com
          const webhookData = {
            email,
            adminName,
            inviteLink,
            role
          }
          
          console.log('📤 Sending to Make.com webhook:', webhookData)
          
          const emailResult = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          })
          
          if (!emailResult.ok) {
            throw new Error(`Make.com webhook failed with status: ${emailResult.status}`)
          }
          
          const responseText = await emailResult.text()
          console.log('✅ Email sent via Make.com:', responseText)

          results.push({
            email,
            status: 'success',
            webhookResponse: responseText,
            inviteLink,
            message: 'Invitation email sent successfully via Make.com'
          })

        } catch (emailError) {
          // If Make.com webhook fails, still return the link for manual sending
          console.error('❌ Make.com webhook failed for', email, ':', emailError)
          console.error('❌ Error details:', JSON.stringify(emailError, null, 2))
          
          results.push({
            email,
            status: 'email_failed',
            inviteLink,
            message: 'Invite created but email sending failed. Please send the link manually.',
            error: emailError instanceof Error ? emailError.message : 'Unknown email error'
          })
        }

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
    const emailFailedCount = results.filter(r => r.status === 'email_failed').length
    const errorCount = results.filter(r => r.status === 'error').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    return NextResponse.json({
      success: true,
      summary: {
        total: emails.length,
        successful: successCount,
        emailFailed: emailFailedCount,
        errors: errorCount,
        skipped: skippedCount
      },
      results
    })

  } catch (error) {
    console.error('Invitation API error:', error)
    if (error instanceof Error && error.message.includes('Missing')) {
      return NextResponse.json({ error: 'Configuration error: ' + error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: 'Failed to process invitations' },
      { status: 500 }
    )
  }
} 