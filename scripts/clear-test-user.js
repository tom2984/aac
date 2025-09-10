const { createClient } = require('@supabase/supabase-js')

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearTestUser(email) {
  try {
    console.log(`🗑️ Clearing user data for: ${email}`)
    
    // 1. Delete from profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('email', email)
    
    if (profileError) {
      console.error('❌ Error deleting profile:', profileError)
    } else {
      console.log('✅ Deleted profile')
    }
    
    // 2. Delete pending invite tokens
    const { error: tokenError } = await supabaseAdmin
      .from('invite_tokens')
      .delete()
      .eq('email', email)
    
    if (tokenError) {
      console.error('❌ Error deleting invite tokens:', tokenError)
    } else {
      console.log('✅ Deleted invite tokens')
    }
    
    // 3. Delete from auth.users (this will cascade to profiles)
    const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (getUserError) {
      console.error('❌ Error getting users:', getUserError)
      return
    }
    
    const user = users.users.find(u => u.email === email)
    if (user) {
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
      if (deleteUserError) {
        console.error('❌ Error deleting auth user:', deleteUserError)
      } else {
        console.log('✅ Deleted auth user')
      }
    } else {
      console.log('ℹ️ No auth user found with that email')
    }
    
    console.log('🎉 User cleanup complete!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run cleanup
const email = process.argv[2]
if (!email) {
  console.error('❌ Please provide an email address')
  console.log('Usage: node scripts/clear-test-user.js your@email.com')
  process.exit(1)
}

clearTestUser(email)
