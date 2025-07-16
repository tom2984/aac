import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Server-side Supabase client with service role key (bypasses RLS)
export const supabaseServer = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) 