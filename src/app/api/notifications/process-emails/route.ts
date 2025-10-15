import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  return { supabaseAdmin }
}

export async function POST() {
  try {
    const { supabaseAdmin } = getSupabaseClients()
    
    console.log('🔍 Processing email notifications...')
    
    // Get unprocessed question_answered notifications
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .select(`
        id, 
        recipient_id, 
        type, 
        title, 
        message, 
        data,
        created_at,
        profiles!recipient_id(email, first_name, last_name)
      `)
      .eq('type', 'question_answered')
      .is('processed_at', null) // Only unprocessed notifications
      .order('created_at', { ascending: true })
      .limit(10) // Process in batches

    if (notificationsError) {
      throw new Error(`Failed to fetch notifications: ${notificationsError.message}`)
    }

    if (!notifications || notifications.length === 0) {
      console.log('📭 No unprocessed notifications found')
      return NextResponse.json({ 
        success: true, 
        message: 'No notifications to process',
        processed: 0 
      })
    }

    console.log(`📧 Found ${notifications.length} notifications to process`)
    
    let processed = 0
    let errors = 0

    for (const notification of notifications) {
      try {
        const notificationData = notification.data as any
        const recipientProfile = notification.profiles as any

        if (!recipientProfile?.email) {
          console.error(`❌ No email found for recipient ${notification.recipient_id}`)
          errors++
          continue
        }

        // Get form and submitter details
        const { data: formData } = await supabaseAdmin
          .from('forms')
          .select('title')
          .eq('id', notificationData.form_id)
          .single()

        const { data: responseData } = await supabaseAdmin
          .from('form_responses')
          .select(`
            respondent_id,
            profiles!respondent_id(first_name, last_name, email)
          `)
          .eq('id', notificationData.response_id)
          .single()

        const submitterProfile = responseData?.profiles as any
        const submitterName = submitterProfile 
          ? `${submitterProfile.first_name || ''} ${submitterProfile.last_name || ''}`.trim() || submitterProfile.email || 'Unknown User'
          : 'Unknown User'

        // Format answer
        let formattedAnswer = notificationData.answer
        if (typeof formattedAnswer === 'object') {
          if (Array.isArray(formattedAnswer)) {
            formattedAnswer = formattedAnswer.join(', ')
          } else {
            formattedAnswer = JSON.stringify(formattedAnswer)
          }
        }

        // Prepare email payload
        const emailPayload = {
          recipientEmail: recipientProfile.email,
          questionText: notificationData.question_text,
          formattedAnswer: formattedAnswer,
          formTitle: formData?.title || 'Unknown Form',
          submitterName: submitterName,
          responseId: notificationData.response_id,
          questionId: notificationData.question_id
        }

        console.log(`📧 Sending email for notification ${notification.id} to ${recipientProfile.email}`)

        // Call the email API
        const emailResponse = await fetch(`${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/notifications/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload)
        })

        if (!emailResponse.ok) {
          throw new Error(`Email API failed: ${emailResponse.status} ${emailResponse.statusText}`)
        }

        const emailResult = await emailResponse.json()
        console.log(`✅ Email sent for notification ${notification.id}:`, emailResult)

        // Mark notification as processed
        await supabaseAdmin
          .from('notifications')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', notification.id)

        processed++

      } catch (error) {
        console.error(`❌ Failed to process notification ${notification.id}:`, error)
        errors++
      }
    }

    console.log(`🎯 Email processing complete: ${processed} sent, ${errors} errors`)

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${processed} notifications with ${errors} errors`,
      processed,
      errors 
    })

  } catch (error) {
    console.error('❌ Email processing failed:', error)
    return NextResponse.json({ 
      error: 'Failed to process email notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
