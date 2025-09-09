import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { questionText, answer, formTitle, submitterName, responseId, questionId, recipientEmail } = await request.json()

    // Validate required fields
    if (!questionText || !answer || !formTitle || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Format the answer based on its type
    let formattedAnswer = answer
    if (typeof answer === 'object') {
      if (Array.isArray(answer)) {
        formattedAnswer = answer.join(', ')
      } else {
        formattedAnswer = JSON.stringify(answer)
      }
    }

    console.log('📧 Sending notification email for question:', questionText)

    const webhookUrl = process.env.MAKE_NOTIFICATION_WEBHOOK_URL
    
    if (!webhookUrl) {
      throw new Error('Missing MAKE_NOTIFICATION_WEBHOOK_URL environment variable')
    }
    
    const emailPayload = {
      recipientEmail: recipientEmail,
      questionText: questionText,
      formattedAnswer: formattedAnswer,
      formTitle: formTitle,
      submitterName: submitterName || 'Unknown User',
      responseId: responseId,
      questionId: questionId
    }
    
    const emailResult = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    })
    
    if (!emailResult.ok) {
      throw new Error(`Make.com webhook failed: ${emailResult.status} ${emailResult.statusText}`)
    }
    
    const makeResponse = await emailResult.json()
    console.log('✅ Notification email sent via Make.com:', makeResponse)

    return NextResponse.json({ 
      success: true, 
      message: 'Email notification sent successfully via Make.com'
    })

  } catch (error) {
    console.error('❌ Failed to send notification via Make.com:', error)
    
    return NextResponse.json({ 
      error: 'Failed to send email notification via Make.com: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
