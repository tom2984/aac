// scripts/seed-days-lost-responses.js
// Usage: node scripts/seed-days-lost-responses.js
// Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment

const { createClient } = require('@supabase/supabase-js')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const months = [
  '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
  '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
]

const userId = null // Use null for anon, or set to a real user id if you want

async function seed() {
  for (const month of months) {
    const formTitle = `Days Lost Report - ${month}`
    // Find the form
    const { data: forms, error: formError } = await supabase
      .from('forms')
      .select('id')
      .eq('title', formTitle)
    if (formError || !forms || forms.length === 0) {
      console.error(`Form not found for ${month}`)
      continue
    }
    const formId = forms[0].id
    // Create a response
    const { data: responseData, error: responseError } = await supabase
      .from('form_responses')
      .insert([
        {
          form_id: formId,
          respondent_id: userId,
          status: 'completed',
          started_at: `${month}-28T10:00:00Z`,
          submitted_at: `${month}-28T10:10:00Z`,
          metadata: {},
        },
      ])
      .select()
      .single()
    if (responseError) {
      console.error(`Error inserting response for ${month}:`, responseError)
      continue
    }
    const responseId = responseData.id
    // Find all days lost questions for this form
    const { data: questions, error: qError } = await supabase
      .from('form_questions')
      .select('id,question_text')
      .eq('form_id', formId)
    if (qError || !questions) {
      console.error(`Error fetching questions for ${month}:`, qError)
      continue
    }
    for (const q of questions) {
      // Only answer 'days lost' questions
      if (!q.question_text.toLowerCase().includes('days were lost')) continue
      // Random days lost (1-5)
      const daysLost = Math.floor(Math.random() * 5) + 1
      const { error: answerError } = await supabase
        .from('form_response_answers')
        .insert([
          {
            response_id: responseId,
            question_id: q.id,
            answer: JSON.stringify(daysLost),
          },
        ])
      if (answerError) {
        console.error(`Error inserting answer for question ${q.id} in ${month}:`, answerError)
      } else {
        console.log(`Inserted answer (${daysLost} days) for question '${q.question_text}' in ${month}`)
      }
    }
  }
  console.log('Seeding complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
}) 