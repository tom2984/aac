const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSupabaseConnection() {
  console.log('🔍 Checking Supabase connection and permissions...\n')
  
  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}`)
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}`)
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'}\n`)
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  SERVICE ROLE KEY MISSING!')
    console.log('This is needed to bypass Row Level Security (RLS) policies.\n')
    
    console.log('📝 To fix this:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to Settings > API')
    console.log('3. Copy the "service_role" key (not the anon key)')
    console.log('4. Add this line to your .env.local file:')
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here')
    console.log('5. Run this script again\n')
    return
  }
  
  // Test both clients
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  try {
    console.log('🧪 Testing Anon Key (limited permissions):')
    const { data: anonData, error: anonError } = await anonClient
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (anonError) {
      console.log(`❌ Anon key error: ${anonError.message}`)
    } else {
      console.log('✅ Anon key can read profiles')
    }
    
    console.log('\n🧪 Testing Service Role Key (admin permissions):')
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (serviceError) {
      console.log(`❌ Service key error: ${serviceError.message}`)
    } else {
      console.log('✅ Service key can read profiles')
      
      // Test insert permission
      console.log('\n🧪 Testing insert permissions with Service Role Key:')
      const { data: insertData, error: insertError } = await serviceClient
        .from('profiles')
        .insert({
          id: 'test-id-12345',
          email: 'test@example.com',
          role: 'test',
          status: 'test'
        })
        .select()
      
      if (insertError) {
        console.log(`❌ Insert test failed: ${insertError.message}`)
        if (insertError.code === '23505') {
          console.log('   (This might be because test data already exists - that\'s okay)')
        }
      } else {
        console.log('✅ Service key can insert into profiles')
        
        // Clean up test data
        await serviceClient
          .from('profiles')
          .delete()
          .eq('id', 'test-id-12345')
        console.log('🧹 Cleaned up test data')
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkSupabaseConnection() 