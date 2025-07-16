import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email, password, redirectTo } = await request.json()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      user: data.user,
      session: data.session 
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to sign up' 
    }, { status: 500 })
  }
} 