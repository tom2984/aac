import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const supabase = createClient()
    
    console.log('🔍 Debug: Looking up token:', token?.substring(0, 8) + '...')
    
    // Get the specific token
    const { data: tokenData, error } = await supabase
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .single()
    
    if (error) {
      console.log('❌ Debug: Token lookup error:', error)
      return NextResponse.json({ 
        error: error.message, 
        code: error.code,
        token: token?.substring(0, 8) + '...'
      }, { status: 404 })
    }
    
    // Get current time for comparison
    const currentTime = new Date().toISOString()
    const isExpired = new Date(tokenData.expires_at) <= new Date(currentTime)
    
    console.log('✅ Debug: Token found:', {
      email: tokenData.email,
      status: tokenData.status,
      expires_at: tokenData.expires_at,
      isExpired
    })
    
    return NextResponse.json({
      currentTime,
      token: {
        id: tokenData.id,
        email: tokenData.email,
        role: tokenData.role,
        status: tokenData.status,
        token: tokenData.token?.substring(0, 8) + '...',
        expires_at: tokenData.expires_at,
        created_at: tokenData.created_at,
        isExpired,
        invited_by: tokenData.invited_by
      }
    })
  } catch (error) {
    console.log('❌ Debug: Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
