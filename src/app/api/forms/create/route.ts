import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { 
      title, 
      description, 
      userId, 
      settings, 
      metadata, 
      questions, 
      assignments 
    } = await request.json()

    // Validation
    if (!title || !userId) {
      return NextResponse.json({ 
        error: 'Title and user ID are required' 
      }, { status: 400 })
    }

    // Insert form
    const { data: formData, error: formError } = await supabase
      .from('forms')
      .insert([{
        title,
        description,
        created_by: userId,
        settings,
        metadata,
      }])
      .select()
      .single()

    if (formError) {
      return NextResponse.json({ 
        error: 'Error creating form: ' + formError.message 
      }, { status: 400 })
    }

    // Insert questions
    const questionResults = []
    for (const [order_index, q] of questions.entries()) {
      if (!q.description) continue // Skip empty questions
      
      const options = (q.type === 'single_select' || q.type === 'multi_select') 
        ? q.options.filter((opt: string) => opt.trim()) 
        : []
      
      const { data: questionData, error: questionError } = await supabase
        .from('form_questions')
        .insert([{
          form_id: formData.id,
          question_text: q.description,
          question_type: q.type,
          is_required: q.isRequired,
          order_index,
          options: options.length ? JSON.stringify(options) : '[]',
          preset_question_id: q.preset_question_id || null,
        }])
        .select()

      if (questionError) {
        questionResults.push({ error: questionError.message, question: q.description })
      } else {
        questionResults.push({ success: true, data: questionData })
      }
    }

    // Create form assignments
    let assignmentResult = null
    if (assignments && assignments.length > 0) {
      const assignmentInserts = assignments.map((employeeId: string) => ({
        form_id: formData.id,
        employee_id: employeeId,
        assigned_by: userId,
        status: 'pending' as const,
        due_date: settings?.due_date || null,
      }))

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('form_assignments')
        .insert(assignmentInserts)
        .select()

      if (assignmentError) {
        assignmentResult = { error: assignmentError.message }
      } else {
        assignmentResult = { success: true, data: assignmentData }
      }
    }

    return NextResponse.json({
      data: {
        form: formData,
        questions: questionResults,
        assignments: assignmentResult
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to create form' 
    }, { status: 500 })
  }
} 