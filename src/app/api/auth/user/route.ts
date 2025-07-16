import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // If there's an error but it's just "no session", return null user
    if (error && error.message === 'Auth session missing!') {
      return NextResponse.json({ user: null })
    }
    
    // If there's another type of error, return it
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get user' 
    }, { status: 500 })
  }
} 