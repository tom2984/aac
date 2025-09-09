import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get all recent tokens
    const { data: tokens, error } = await supabase
      .from('invite_tokens')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Get current time for comparison
    const currentTime = new Date().toISOString()
    
    return NextResponse.json({
      currentTime,
      tokens: tokens?.map(token => ({
        id: token.id,
        email: token.email,
        role: token.role,
        status: token.status,
        token: token.token?.substring(0, 8) + '...',
        expires_at: token.expires_at,
        created_at: token.created_at,
        isExpired: new Date(token.expires_at) <= new Date(currentTime)
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
