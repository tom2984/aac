import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ message: 'Successfully signed out' })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to sign out' 
    }, { status: 500 })
  }
} 