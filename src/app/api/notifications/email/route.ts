import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    console.log('📧 Sending email notification for question:', questionText)

    const emailResult = await resend.emails.send({
      from: 'AAC Forms <info@aacflatroofing.co.uk>',
      to: [recipientEmail],
      subject: `Form Question Answered: ${questionText.substring(0, 50)}${questionText.length > 50 ? '...' : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Form Question Answered</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #FF6551; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .question { background: #e9f7ef; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .answer { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
              .footer { margin-top: 30px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 Monitored Question Answered</h1>
              </div>
              <div class="content">
                <h2>A question you're monitoring has been answered</h2>
                
                <div class="question">
                  <h3>Question:</h3>
                  <p><strong>${questionText}</strong></p>
                </div>
                
                <div class="answer">
                  <h3>Answer:</h3>
                  <p><strong>${formattedAnswer}</strong></p>
                </div>
                
                <div style="margin: 20px 0;">
                  <p><strong>Form:</strong> ${formTitle}</p>
                  <p><strong>Submitted by:</strong> ${submitterName || 'Unknown User'}</p>
                  <p><strong>Submission Time:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="footer">
                  <p><em>This is an automated notification from your AAC form system.</em></p>
                  <p>You're receiving this because you have email notifications enabled for this question.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    })

    console.log('✅ Email notification sent successfully:', emailResult.data?.id)

    return NextResponse.json({ 
      success: true, 
      emailId: emailResult.data?.id,
      message: 'Email notification sent successfully'
    })

  } catch (error) {
    console.error('❌ Failed to send email notification:', error)
    
    return NextResponse.json({ 
      error: 'Failed to send email notification: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
