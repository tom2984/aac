import { NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase-client'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      role, 
      inviteToken, 
      skipEmailConfirmation,
      redirectTo 
    } = await request.json()
    
    console.log('🔐 Custom signup API called for:', email, 'skipEmailConfirmation:', skipEmailConfirmation)
    
    const supabase = supabaseClient
    
    // For invited users, we'll use service role to bypass email confirmation
    const signupOptions: any = {
      emailRedirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        first_name: firstName,
        last_name: lastName,
        role: role || 'employee',
        invited_via_token: !!inviteToken
      }
    }
    
    // If this is an invited user and we want to skip email confirmation
    if (skipEmailConfirmation && inviteToken) {
      console.log('✅ Bypassing email confirmation for invited user')
      // Use service role client to bypass email confirmation
      const supabaseAdmin = supabaseServer
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: signupOptions.data
      })
      
      if (error) {
        console.error('❌ Admin createUser error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      console.log('✅ User created with auto-confirmed email:', data.user?.id)
      
      // Create profile record with invite relationship
      if (data.user) {
        let invitedBy = null
        
        // Get the invited_by relationship from the invite token
        if (inviteToken) {
          const { data: inviteData } = await supabaseAdmin
            .from('invite_tokens')
            .select('invited_by')
            .eq('token', inviteToken)
            .eq('status', 'pending')
            .single()
          
          invitedBy = inviteData?.invited_by || null
          console.log('✅ Found invite relationship - invited_by:', invitedBy)
        }
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            first_name: firstName,
            last_name: lastName,
            role: role || 'employee',
            status: 'active',
            invited_by: invitedBy
          })
        
        if (profileError) {
          console.error('❌ Profile creation error:', profileError)
          // Don't fail the whole process for profile errors
        } else {
          console.log('✅ Profile created successfully')
        }
        
        // Mark invite token as accepted if provided
        if (inviteToken) {
          const { error: tokenError } = await supabaseAdmin
            .from('invite_tokens')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('token', inviteToken)
          
          if (tokenError) {
            console.error('❌ Token update error:', tokenError)
          } else {
            console.log('✅ Invite token marked as accepted')
          }
        }
      }
      
      // After creating user with admin, sign them in automatically
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (signInError) {
        console.error('❌ Auto sign-in error:', signInError)
        // Return user data even if auto sign-in fails
        return NextResponse.json({ 
          user: data.user,
          session: null,
          message: 'Account created but auto sign-in failed. Please sign in manually.'
        })
      }
      
      console.log('✅ User automatically signed in after creation')
      return NextResponse.json({ 
        user: signInData.user,
        session: signInData.session
      })
    } else {
      console.log('📧 Using custom signup flow with branded confirmation email')
      // Use service role to create user without triggering Supabase's default email
      const supabaseAdmin = supabaseServer
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // Don't auto-confirm, we'll send custom email
        user_metadata: signupOptions.data
      })
      
      if (error) {
        console.error('❌ Admin createUser error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      console.log('✅ User created with unconfirmed email:', data.user?.id)
      
      // Create profile record
      if (data.user) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: data.user.id,
            role: role || 'admin',
            status: 'pending', // Will be active after email confirmation
            first_name: firstName,
            last_name: lastName,
            email: data.user.email,
            invited_by: null
          })
          
        if (profileError) {
          console.error('❌ Profile creation error:', profileError)
        } else {
          console.log('✅ Profile created for user:', data.user.id)
        }
      }
      
      // Send our custom confirmation email
      try {
        console.log('📧 Sending custom confirmation email to:', email)
        
        // Get the site URL - detect local development vs production
        let siteUrl
        if (process.env.NODE_ENV === 'development') {
          // Force localhost for development
          siteUrl = 'http://localhost:3000'
          console.log('🔧 Development mode detected - using localhost URL')
        } else {
          // Use production URL for deployed environments  
          siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'http://localhost:3000')
          console.log('🚀 Production mode detected - using production URL:', siteUrl)
        }
        
        const confirmationResponse = await fetch(`${siteUrl}/api/auth/signup-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email })
        })

        if (!confirmationResponse.ok) {
          console.error('❌ Failed to send confirmation email')
        } else {
          console.log('✅ Custom confirmation email sent successfully')
        }
      } catch (emailError) {
        console.error('❌ Error sending confirmation email:', emailError)
      }
      
      return NextResponse.json({ 
        user: data.user,
        session: null, // No session until email is confirmed
        message: 'Account created successfully. Please check your email for confirmation.'
      })
    }
  } catch (error) {
    console.error('❌ Signup API error:', error)
    return NextResponse.json({ 
      error: 'Failed to sign up' 
    }, { status: 500 })
  }
} 