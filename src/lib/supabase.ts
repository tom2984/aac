import { createClient } from '@supabase/supabase-js'
import type { Database, Json, QuestionType } from '@/types/database'

// Create and export the Supabase client
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Type aliases for convenience (app-specific)
export type Form = Database['public']['Tables']['forms']['Row']
export type FormInsert = Database['public']['Tables']['forms']['Insert']
export type FormUpdate = Database['public']['Tables']['forms']['Update']

// Re-export types for convenience
export type { Database, Json, QuestionType }