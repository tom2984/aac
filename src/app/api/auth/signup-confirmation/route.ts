import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log('📧 Sending custom signup confirmation email to:', email)

    // Generate a secure confirmation token
    const token = generateConfirmationToken()
    
    // Store the token in database for verification
    const supabaseAdmin = supabaseServer
    const { error: tokenError } = await supabaseAdmin
      .from('signup_confirmation_tokens')
      .insert({
        email,
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })

    if (tokenError) {
      console.error('❌ Error storing confirmation token:', tokenError)
      return NextResponse.json({ error: 'Failed to create confirmation token' }, { status: 500 })
    }

    // Send custom confirmation email via Make.com webhook
    const webhookUrl = process.env.MAKE_SIGNUP_CONFIRMATION_WEBHOOK_URL
    
    if (!webhookUrl) {
      console.error('❌ Missing MAKE_SIGNUP_CONFIRMATION_WEBHOOK_URL environment variable')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

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
    
    const confirmationUrl = `${siteUrl}/auth/confirm?token=${token}`
    
    const emailPayload = {
      email,
      confirmationUrl,
      timestamp: new Date().toISOString()
    }
    
    const emailResult = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    })
    
    if (!emailResult.ok) {
      throw new Error(`Make.com webhook failed: ${emailResult.status} ${emailResult.statusText}`)
    }
    
    const makeResponse = await emailResult.json()
    console.log('✅ Signup confirmation email sent via Make.com:', makeResponse)

    return NextResponse.json({ 
      success: true, 
      message: 'Confirmation email sent successfully'
    })

  } catch (error) {
    console.error('❌ Failed to send signup confirmation email:', error)
    
    return NextResponse.json({ 
      error: 'Failed to send confirmation email: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}

// Generate a secure random token for email confirmation
function generateConfirmationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
