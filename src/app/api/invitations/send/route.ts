import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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

function getResendClient() {
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable')
  }
  
  return new Resend(resendApiKey)
}

export async function POST(request: Request) {
  try {
    const { supabase, supabaseAdmin } = getSupabaseClients()
    const resend = getResendClient()
    
    // Test Resend configuration
    console.log('📧 Resend API Key present:', !!process.env.RESEND_API_KEY)
    console.log('📧 Resend API Key length:', process.env.RESEND_API_KEY?.length || 0)
    
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

        // Send email using Resend
        try {
          console.log('🔑 About to send email with Resend API key:', process.env.RESEND_API_KEY ? 'Found' : 'Missing')
          console.log('📧 Sending email to:', email)
          
          const emailResult = await resend.emails.send({
            from: 'AAC Team <info@aacflatroofing.co.uk>',
            to: [email], // Resend prefers array format
            subject: `You're invited to join the AAC team!`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>Team Invitation</title>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #FF6551; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #FF6551; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                    .footer { margin-top: 30px; font-size: 14px; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Welcome to AAC!</h1>
                    </div>
                    <div class="content">
                      <h2>You've been invited to join our team</h2>
                      <p>Hi there!</p>
                      <p><strong>${adminName}</strong> has invited you to join the AAC form management system as ${role === 'admin' ? 'an administrator' : 'a team member'}.</p>
                      
                      <p>To get started, click the button below to create your account:</p>
                      
                      <a href="${inviteLink}" class="button">Accept Invitation</a>
                      
                      <p>Or copy and paste this link into your browser:</p>
                      <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 4px;">${inviteLink}</p>
                      
                      <div class="footer">
                        <p><strong>What happens next?</strong></p>
                        <ul>
                          <li>Create your account using the link above</li>
                          <li>Complete your profile information</li>
                          <li>${role === 'admin' ? 'Access the admin dashboard to manage forms and team members' : 'Download the mobile app to complete assigned forms'}</li>
                        </ul>
                        
                        <p>If you have any questions, please contact ${adminName} or your system administrator.</p>
                        <p><em>This invitation will expire in 7 days for security reasons.</em></p>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `
          })

          console.log('✅ Email send result:', emailResult)
          console.log('📧 Email ID:', emailResult.data?.id)

          results.push({
            email,
            status: 'success',
            emailId: emailResult.data?.id,
            inviteLink, // Still provide link as backup
            message: 'Invitation email sent successfully'
          })

        } catch (emailError) {
          // If email sending fails, still return the link for manual sending
          console.error('❌ Email sending failed for', email, ':', emailError)
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