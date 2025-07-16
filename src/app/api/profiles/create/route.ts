import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const profileData = await request.json()
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to create profile' 
    }, { status: 500 })
  }
} 