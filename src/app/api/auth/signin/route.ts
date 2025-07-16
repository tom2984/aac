import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    return NextResponse.json({ 
      user: data.user,
      session: data.session 
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to sign in' 
    }, { status: 500 })
  }
} 