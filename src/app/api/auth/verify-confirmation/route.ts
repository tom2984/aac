import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    console.log('🔍 Verifying confirmation token:', token)

    const supabaseAdmin = supabaseServer
    
    // Find the token in the database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('signup_confirmation_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !tokenData) {
      console.log('❌ Token not found or already used:', tokenError)
      return NextResponse.json({ error: 'Invalid or expired confirmation token' }, { status: 400 })
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now > expiresAt) {
      console.log('❌ Token has expired:', { now, expiresAt })
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    // Mark token as used
    const { error: updateError } = await supabaseAdmin
      .from('signup_confirmation_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', token)

    if (updateError) {
      console.error('❌ Error marking token as used:', updateError)
      return NextResponse.json({ error: 'Failed to process confirmation' }, { status: 500 })
    }

    // Find the user by email and confirm their account
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Error listing users:', userError)
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 })
    }

    const user = users.users.find(u => u.email === tokenData.email)
    
    if (!user) {
      console.error('❌ User not found for email:', tokenData.email)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Confirm the user's email
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true
    })

    if (confirmError) {
      console.error('❌ Error confirming user email:', confirmError)
      return NextResponse.json({ error: 'Failed to confirm account' }, { status: 500 })
    }

    console.log('✅ User email confirmed successfully:', tokenData.email)

    return NextResponse.json({ 
      success: true, 
      message: 'Account confirmed successfully',
      email: tokenData.email
    })

  } catch (error) {
    console.error('❌ Error verifying confirmation token:', error)
    
    return NextResponse.json({ 
      error: 'Failed to verify confirmation: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
