// scripts/seed-days-lost-forms.js
// Usage: node scripts/seed-days-lost-forms.js
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

const reasons = [
  { key: 'weather', label: 'weather' },
  { key: 'technical', label: 'technical problems' },
  { key: 'other', label: 'other reasons' }
]

const users = [
  { name: 'Alice Example', email: 'alice@example.com' },
  { name: 'Bob Example', email: 'bob@example.com' }
]

async function seed() {
  for (const month of months) {
    const due_date = month + '-28'
    const title = `Days Lost Report - ${month}`
    const description = `Monthly days lost report for ${month}`
    // Check if form already exists
    const { data: existingForms } = await supabase
      .from('forms')
      .select('id')
      .eq('title', title)
    let formId
    if (existingForms && existingForms.length > 0) {
      formId = existingForms[0].id
      console.log(`Form already exists for ${month}, skipping form creation.`)
    } else {
      // Insert form
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .insert([
          {
            title,
            description,
            settings: { module: 'Monitoring', due_date },
            metadata: { users },
          },
        ])
        .select()
        .single()
      if (formError) {
        console.error('Error inserting form:', formError)
        continue
      }
      formId = formData.id
      console.log('Inserted form:', title)
    }
    // For each reason, add a question if not already present
    for (const reason of reasons) {
      const question_text = `How many days were lost due to ${reason.label}?`
      // Check if question already exists for this form
      const { data: existingQuestions } = await supabase
        .from('form_questions')
        .select('id')
        .eq('form_id', formId)
        .eq('question_text', question_text)
      if (existingQuestions && existingQuestions.length > 0) {
        console.log(`Question already exists for ${reason.label} in ${month}, skipping.`)
        continue
      }
      // Insert question
      const { error: qError } = await supabase
        .from('form_questions')
        .insert([
          {
            form_id: formId,
            question_text,
            question_type: 'number',
            is_required: false,
            order_index: reasons.findIndex(r => r.key === reason.key) + 1,
            options: '[]',
          },
        ])
      if (qError) {
        console.error(`Error inserting question for ${reason.label} in ${month}:`, qError)
      } else {
        console.log(`Inserted question for ${reason.label} in ${month}`)
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