import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    // Check if Resend API key is available
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY environment variable not found',
        available_vars: Object.keys(process.env).filter(key => key.includes('RESEND'))
      }, { status: 500 })
    }

    console.log('🔑 Resend API Key found:', resendApiKey.substring(0, 10) + '...')

    const resend = new Resend(resendApiKey)

    // Send a simple test email
    console.log('📧 Attempting to send test email to:', email)
    
    const result = await resend.emails.send({
      from: 'AAC Test <onboarding@resend.dev>',
      to: email,
      subject: 'Test Email from AAC',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend integration is working.</p>
        <p>If you receive this, email sending is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    })

    console.log('✅ Email send result:', result)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: result.data?.id,
      resendResponse: result
    })

  } catch (error) {
    console.error('❌ Email sending error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email test endpoint. Send POST request with { "email": "test@example.com" }'
  })
} 