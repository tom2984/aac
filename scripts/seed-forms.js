// scripts/seed-forms.js
// Usage: node scripts/seed-forms.js
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

const forms = [
  {
    title: 'Monthly Compliance Check',
    description: 'Routine compliance form for all departments.',
    settings: { module: 'Compliance', due_date: '2024-07-01' },
    metadata: {
      users: [
        { name: 'Alice Example', email: 'alice@example.com' },
        { name: 'Bob Example', email: 'bob@example.com' }
      ]
    },
    questions: [
      {
        question_text: 'What is your department?',
        question_type: 'text',
        is_required: true,
        order_index: 1
      },
      {
        question_text: 'How many compliance issues did you find?',
        question_type: 'number',
        is_required: false,
        order_index: 2
      },
      {
        question_text: 'Select compliance area(s)',
        question_type: 'multiselect',
        is_required: false,
        order_index: 3,
        options: ['HR', 'Finance', 'IT', 'Operations']
      }
    ]
  },
  {
    title: 'Weekly Monitoring Report',
    description: 'Monitoring form for weekly site checks.',
    settings: { module: 'Monitoring', due_date: '2024-07-05' },
    metadata: {
      users: [
        { name: 'Charlie Example', email: 'charlie@example.com' }
      ]
    },
    questions: [
      {
        question_text: 'Date of monitoring',
        question_type: 'date',
        is_required: true,
        order_index: 1
      },
      {
        question_text: 'Were there any incidents?',
        question_type: 'select',
        is_required: true,
        order_index: 2,
        options: ['Yes', 'No']
      },
      {
        question_text: 'Describe any issues found',
        question_type: 'textarea',
        is_required: false,
        order_index: 3
      }
    ]
  }
]

async function seed() {
  for (const form of forms) {
    const { title, description, settings, metadata, questions } = form
    const { data: formData, error: formError } = await supabase
      .from('forms')
      .insert([
        { title, description, settings, metadata }
      ])
      .select()
      .single()
    if (formError) {
      console.error('Error inserting form:', formError)
      continue
    }
    console.log('Inserted form:', formData.title)
    for (const q of questions) {
      const { question_text, question_type, is_required, order_index, options } = q
      const { error: qError } = await supabase
        .from('form_questions')
        .insert([
          {
            form_id: formData.id,
            question_text,
            question_type,
            is_required,
            order_index,
            options: options ? JSON.stringify(options) : '[]'
          }
        ])
      if (qError) {
        console.error(`Error inserting question for form ${formData.title}:`, qError)
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