const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function setupAdminProfile() {
  console.log('Starting admin profile setup...')
  
  try {
    const ADMIN_AUTH_ID = 'fd0aab95-5e79-4ad6-a2e2-687adbe5e52c' // Your auth ID
    const ADMIN_EMAIL = 'hello@tsaunders.dev'
    
    console.log('👤 Setting up admin profile...')
    console.log(`🆔 Auth ID: ${ADMIN_AUTH_ID}`)
    console.log(`📧 Email: ${ADMIN_EMAIL}`)
    
    // Check if admin profile exists
    const { data: existingAdmin, error: checkAdminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ADMIN_AUTH_ID)
      .single()
    
    if (checkAdminError && checkAdminError.code === 'PGRST116') {
      // Admin profile doesn't exist, create it
      console.log('🆕 Creating new admin profile...')
      
      const { data: newAdmin, error: createAdminError } = await supabase
        .from('profiles')
        .insert({
          id: ADMIN_AUTH_ID,
          email: ADMIN_EMAIL,
          role: 'admin',
          status: 'active',
          first_name: 'Tom',
          last_name: 'Saunders'
        })
        .select()
        .single()
      
      if (createAdminError) {
        console.error('❌ Error creating admin profile:', createAdminError)
        console.error('Details:', createAdminError.details)
        console.error('Hint: Make sure the auth ID exists in Supabase Auth and matches exactly')
        return
      }
      
      console.log('✅ Admin profile created successfully:', newAdmin)
    } else if (checkAdminError) {
      console.error('❌ Error checking admin profile:', checkAdminError)
      return
    } else {
      console.log('✅ Admin profile already exists:', existingAdmin)
      
      // Update to ensure it's an admin
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          status: 'active',
          email: ADMIN_EMAIL
        })
        .eq('id', ADMIN_AUTH_ID)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ Error updating admin profile:', updateError)
        return
      }
      
      console.log('✅ Admin profile updated:', updatedAdmin)
    }
    
    // Verify the admin profile
    console.log('🔍 Verifying admin profile...')
    const { data: finalAdmin, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ADMIN_AUTH_ID)
      .eq('role', 'admin')
      .single()
    
    if (verifyError) {
      console.error('❌ Error verifying admin profile:', verifyError)
      return
    }
    
    console.log('✅ Admin verification successful:', finalAdmin)
    
    console.log('\n🎉 Admin setup completed successfully!')
    console.log(`📧 Admin: ${ADMIN_EMAIL}`)
    console.log(`🆔 ID: ${ADMIN_AUTH_ID}`)
    console.log(`\nNext steps:`)
    console.log(`1. Log in as ${ADMIN_EMAIL}`)
    console.log(`2. Go to Dashboard > Forms`)
    console.log(`3. The forms page should now work without the infinite API calls`)
    console.log(`4. We can set up employee profiles separately if needed`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
setupAdminProfile() 