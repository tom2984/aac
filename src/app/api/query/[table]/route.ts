import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { table: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const table = params.table
    const select = searchParams.get('select') || '*'
    const limit = searchParams.get('limit')
    
    let query = supabase.from(table).select(select)
    
    // Apply filters
    searchParams.forEach((value, key) => {
      if (key.startsWith('eq.')) {
        const column = key.replace('eq.', '')
        query = query.eq(column, value)
      }
    })
    
    // Apply limit
    if (limit) {
      query = query.limit(parseInt(limit))
    }
    
    const { data, error } = await query
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to query table' 
    }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { table: string } }
) {
  try {
    const table = params.table
    const body = await request.json()
    
    const { data, error } = await supabase
      .from(table)
      .insert(body)
      .select()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to insert data' 
    }, { status: 500 })
  }
} 