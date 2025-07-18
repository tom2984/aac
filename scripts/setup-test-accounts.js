const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test account details
const TEST_ACCOUNTS = {
  admin: {
    email: 'testadmin@aac.com',
    password: 'TestPassword123!',
    role: 'admin',
    first_name: 'Test',
    last_name: 'Admin'
  },
  employee: {
    email: 'testemployee@aac.com', 
    password: 'TestPassword123!',
    role: 'employee',
    first_name: 'Test',
    last_name: 'Employee'
  }
}

async function setupTestAccounts() {
  console.log('🚀 Setting up test accounts...')
  console.log('📧 Admin: testadmin@aac.com')
  console.log('📧 Employee: testemployee@aac.com')
  console.log('🔑 Password for both: TestPassword123!')
  console.log('')

  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
      return
    }
    
    if (!process.env.SUPABASE_SERVICE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY')
      return
    }

    // Step 1: Create admin auth user
    console.log('👤 Creating admin authentication user...')
    const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_ACCOUNTS.admin.email,
      password: TEST_ACCOUNTS.admin.password,
      email_confirm: true, // Skip email verification for test accounts
      user_metadata: {
        first_name: TEST_ACCOUNTS.admin.first_name,
        last_name: TEST_ACCOUNTS.admin.last_name
      }
    })

    if (adminAuthError) {
      if (adminAuthError.message.includes('already been registered')) {
        console.log('⚠️  Admin user already exists, retrieving...')
        // Get existing user
        const { data: existingAdminUsers, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
        if (getUserError) {
          console.error('❌ Error retrieving existing admin user:', getUserError)
          return
        }
        
        const existingAdmin = existingAdminUsers.users.find(user => user.email === TEST_ACCOUNTS.admin.email)
        if (!existingAdmin) {
          console.error('❌ Admin user exists but could not retrieve')
          return
        }
        
        adminAuthData.user = existingAdmin
      } else {
        console.error('❌ Error creating admin auth user:', adminAuthError)
        return
      }
    }

    console.log('✅ Admin auth user ready:', adminAuthData.user.id)

    // Step 2: Create employee auth user  
    console.log('👤 Creating employee authentication user...')
    const { data: employeeAuthData, error: employeeAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_ACCOUNTS.employee.email,
      password: TEST_ACCOUNTS.employee.password,
      email_confirm: true, // Skip email verification for test accounts
      user_metadata: {
        first_name: TEST_ACCOUNTS.employee.first_name,
        last_name: TEST_ACCOUNTS.employee.last_name
      }
    })

    if (employeeAuthError) {
      if (employeeAuthError.message.includes('already been registered')) {
        console.log('⚠️  Employee user already exists, retrieving...')
        // Get existing user
        const { data: existingEmployeeUsers, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
        if (getUserError) {
          console.error('❌ Error retrieving existing employee user:', getUserError)
          return
        }
        
        const existingEmployee = existingEmployeeUsers.users.find(user => user.email === TEST_ACCOUNTS.employee.email)
        if (!existingEmployee) {
          console.error('❌ Employee user exists but could not retrieve')
          return
        }
        
        employeeAuthData.user = existingEmployee
      } else {
        console.error('❌ Error creating employee auth user:', employeeAuthError)
        return
      }
    }

    console.log('✅ Employee auth user ready:', employeeAuthData.user.id)

    // Step 3: Create/update admin profile
    console.log('📝 Creating admin profile...')
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: adminAuthData.user.id,
        email: TEST_ACCOUNTS.admin.email,
        role: TEST_ACCOUNTS.admin.role,
        status: 'active',
        first_name: TEST_ACCOUNTS.admin.first_name,
        last_name: TEST_ACCOUNTS.admin.last_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (adminProfileError) {
      console.error('❌ Error creating admin profile:', adminProfileError)
      return
    }

    console.log('✅ Admin profile created')

    // Step 4: Create/update employee profile with admin link
    console.log('📝 Creating employee profile and linking to admin...')
    const { data: employeeProfile, error: employeeProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: employeeAuthData.user.id,
        email: TEST_ACCOUNTS.employee.email,
        role: TEST_ACCOUNTS.employee.role,
        status: 'active',
        first_name: TEST_ACCOUNTS.employee.first_name,
        last_name: TEST_ACCOUNTS.employee.last_name,
        invited_by: adminAuthData.user.id, // Link employee to admin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (employeeProfileError) {
      console.error('❌ Error creating employee profile:', employeeProfileError)
      return
    }

    console.log('✅ Employee profile created and linked to admin')

    // Step 5: Verify the setup
    console.log('🔍 Verifying account setup...')
    
    // Check admin can see employee
    const { data: linkedEmployees, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, role, invited_by')
      .eq('role', 'employee')
      .eq('invited_by', adminAuthData.user.id)

    if (verifyError) {
      console.error('❌ Error verifying setup:', verifyError)
      return
    }

    console.log('')
    console.log('🎉 Test accounts setup completed successfully!')
    console.log('')
    console.log('📋 Account Details:')
    console.log('┌─────────────────────────────────────────────────────────┐')
    console.log('│                    ADMIN ACCOUNT                       │')
    console.log('├─────────────────────────────────────────────────────────┤')
    console.log(`│ Email:    ${TEST_ACCOUNTS.admin.email.padEnd(43)} │`)
    console.log(`│ Password: ${TEST_ACCOUNTS.admin.password.padEnd(43)} │`) 
    console.log(`│ Role:     ${TEST_ACCOUNTS.admin.role.padEnd(43)} │`)
    console.log(`│ ID:       ${adminAuthData.user.id.padEnd(43)} │`)
    console.log('└─────────────────────────────────────────────────────────┘')
    console.log('')
    console.log('┌─────────────────────────────────────────────────────────┐')
    console.log('│                   EMPLOYEE ACCOUNT                     │')
    console.log('├─────────────────────────────────────────────────────────┤')
    console.log(`│ Email:    ${TEST_ACCOUNTS.employee.email.padEnd(43)} │`)
    console.log(`│ Password: ${TEST_ACCOUNTS.employee.password.padEnd(43)} │`)
    console.log(`│ Role:     ${TEST_ACCOUNTS.employee.role.padEnd(43)} │`)
    console.log(`│ ID:       ${employeeAuthData.user.id.padEnd(43)} │`)
    console.log(`│ Admin:    ${adminAuthData.user.id.padEnd(43)} │`)
    console.log('└─────────────────────────────────────────────────────────┘')
    console.log('')
    console.log('✅ Linked employees found:', linkedEmployees.length)
    console.log('')
    console.log('🧪 Testing Instructions:')
    console.log('1. Open your application')
    console.log('2. Sign in as testadmin@aac.com with password TestPassword123!')
    console.log('3. Go to Dashboard > Forms')
    console.log('4. Click "Add new form"')
    console.log('5. You should see "Test Employee (testemployee@aac.com)" in the Users section')
    console.log('6. Create a form assigned to the test employee')
    console.log('7. Sign out and sign in as testemployee@aac.com')
    console.log('8. Verify the employee can see assigned forms')
    console.log('')
    console.log('🔐 Note: Both accounts have email verification skipped for testing')

  } catch (error) {
    console.error('❌ Unexpected error during setup:', error)
  }
}

// Run the script
if (require.main === module) {
  setupTestAccounts()
}

module.exports = { setupTestAccounts } 