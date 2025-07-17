import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    supabase_vars: {
      'NEXT_PUBLIC_SUPABASE_URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'SUPABASE_SERVICE_KEY': !!process.env.SUPABASE_SERVICE_KEY,
      'SUPABASE_SERVICE_ROLE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    all_supabase_vars: Object.keys(process.env).filter(key => 
      key.includes('SUPABASE')
    ).reduce((acc, key) => {
      acc[key] = !!process.env[key]
      return acc
    }, {} as Record<string, boolean>)
  })
} 