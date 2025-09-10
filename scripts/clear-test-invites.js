#!/usr/bin/env node

/**
 * Clear test invitations for development
 * Usage: node scripts/clear-test-invites.js [email]
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function clearTestInvites(emailPattern = null) {
  try {
    console.log('🧹 Clearing test invitations...')
    
    let query = supabase
      .from('invite_tokens')
      .delete()
      .eq('status', 'pending')
    
    if (emailPattern) {
      // Clear specific email
      query = query.eq('email', emailPattern)
      console.log(`📧 Targeting email: ${emailPattern}`)
    } else {
      // Clear test emails only (emails containing 'test' or '+test')
      query = query.or('email.ilike.%test%,email.ilike.%+test%')
      console.log('📧 Targeting test emails (containing "test" or "+test")')
    }
    
    const { data, error } = await query.select()
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`✅ Cleared ${data?.length || 0} pending invitations`)
    if (data?.length > 0) {
      data.forEach(invite => {
        console.log(`  - ${invite.email} (${invite.role})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

// Get email from command line argument
const targetEmail = process.argv[2]
clearTestInvites(targetEmail)
