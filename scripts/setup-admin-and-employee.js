const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function setupAdminAndEmployee() {
  console.log('Starting admin and employee profile setup...')
  
  try {
    // You'll need to get the admin's auth ID from Supabase dashboard
    // For now, I'll use a placeholder - you'll need to replace this with the actual admin auth ID
    const ADMIN_AUTH_ID = 'fd0aab95-5e79-4ad6-a2e2-687adbe5e52c' // Admin auth ID from Supabase dashboard
    const EMPLOYEE_AUTH_ID = 'fd0aab95-5e79-4ad6-a2e2-687adbde5e2c' // tomws2984@gmail.com from screenshot
    
    const ADMIN_EMAIL = 'hello@tsaunders.dev'
    const EMPLOYEE_EMAIL = 'tomws2984@gmail.com'
    
    // Step 1: Create or update admin profile
    console.log('👤 Creating/updating admin profile...')
    
    // Check if admin profile exists
    const { data: existingAdmin, error: checkAdminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single()
    
    let adminUser
    
    if (checkAdminError && checkAdminError.code === 'PGRST116') {
      // Admin profile doesn't exist, create it
      console.log('🆕 Creating new admin profile...')
      
      if (ADMIN_AUTH_ID === 'REPLACE_WITH_ADMIN_AUTH_ID') {
        console.log('❌ Please replace ADMIN_AUTH_ID with the actual admin auth ID from Supabase dashboard')
        console.log('📝 Instructions:')
        console.log('1. Go to your Supabase dashboard')
        console.log('2. Navigate to Authentication > Users')
        console.log('3. Find the user with email: hello@tsaunders.dev')
        console.log('4. Copy the UID')
        console.log('5. Replace ADMIN_AUTH_ID in this script with that UID')
        console.log('6. Run the script again')
        return
      }
      
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
        return
      }
      
      console.log('✅ Admin profile created successfully:', newAdmin)
      adminUser = newAdmin
    } else if (checkAdminError) {
      console.error('❌ Error checking admin profile:', checkAdminError)
      return
    } else {
      console.log('✅ Admin profile already exists:', existingAdmin)
      adminUser = existingAdmin
    }
    
    // Step 2: Create or update employee profile
    console.log('👤 Creating/updating employee profile...')
    
    // Check if employee profile exists
    const { data: existingEmployee, error: checkEmployeeError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', EMPLOYEE_AUTH_ID)
      .single()
    
    if (checkEmployeeError && checkEmployeeError.code === 'PGRST116') {
      // Employee profile doesn't exist, create it
      console.log('🆕 Creating new employee profile...')
      
      const { data: newEmployee, error: createEmployeeError } = await supabase
        .from('profiles')
        .insert({
          id: EMPLOYEE_AUTH_ID,
          email: EMPLOYEE_EMAIL,
          role: 'employee',
          invited_by: adminUser.id,
          status: 'active',
          first_name: 'Tom',
          last_name: 'Employee'
        })
        .select()
        .single()
      
      if (createEmployeeError) {
        console.error('❌ Error creating employee profile:', createEmployeeError)
        console.error('Details:', createEmployeeError.details)
        return
      }
      
      console.log('✅ Employee profile created successfully:', newEmployee)
    } else if (checkEmployeeError) {
      console.error('❌ Error checking employee profile:', checkEmployeeError)
      return
    } else {
      console.log('⚠️  Employee profile already exists. Updating connection...')
      
      // Update existing profile to connect to admin
      const { data: updatedEmployee, error: updateEmployeeError } = await supabase
        .from('profiles')
        .update({
          role: 'employee',
          invited_by: adminUser.id,
          status: 'active'
        })
        .eq('id', EMPLOYEE_AUTH_ID)
        .select()
        .single()
      
      if (updateEmployeeError) {
        console.error('❌ Error updating employee profile:', updateEmployeeError)
        return
      }
      
      console.log('✅ Employee profile updated successfully:', updatedEmployee)
    }
    
    // Step 3: Verify the connection
    console.log('🔍 Verifying employee connection...')
    const { data: employees, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, invited_by')
      .eq('role', 'employee')
      .eq('invited_by', adminUser.id)
    
    if (verifyError) {
      console.error('❌ Error verifying connection:', verifyError)
      return
    }
    
    console.log('✅ Connected employees:', employees)
    
    console.log('\n🎉 Setup completed successfully!')
    console.log(`📧 Admin: ${ADMIN_EMAIL}`)
    console.log(`📧 Employee: ${EMPLOYEE_EMAIL}`)
    console.log(`🔗 Connection: Employee is now connected to admin`)
    console.log(`\nNow you can:`)
    console.log(`1. Log in as ${ADMIN_EMAIL} and go to Dashboard > Forms`)
    console.log(`2. Click "Add new form"`)
    console.log(`3. You should see "${EMPLOYEE_EMAIL}" in the Users section`)
    console.log(`4. Select the employee and create a form to test the functionality`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
setupAdminAndEmployee() 