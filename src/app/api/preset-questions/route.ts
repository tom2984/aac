import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    
    if (!adminId) {
      return NextResponse.json({ error: 'admin_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('preset_questions')
      .select('*')
      .eq('admin_id', adminId)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to get preset questions' 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const presetData = await request.json()
    
    const { data, error } = await supabase
      .from('preset_questions')
      .insert(presetData)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to create preset question' 
    }, { status: 500 })
  }
} 