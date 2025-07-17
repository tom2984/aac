import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Validate question type against the actual database enum values
function validateQuestionType(questionType: string): boolean {
  // These are the actual enum values from the database
  const validTypes = [
    'short_text', 'long_text', 'single_select', 'multi_select', 'composite'
  ]
  return validTypes.includes(questionType)
}

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

    console.log('📝 Creating form with data:', {
      title,
      questionCount: questions?.length || 0,
      assignmentCount: assignments?.length || 0
    })

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
      console.error('❌ Form creation error:', formError)
      return NextResponse.json({ 
        error: 'Error creating form: ' + formError.message 
      }, { status: 400 })
    }

    console.log('✅ Form created successfully:', formData.id)

    // Insert questions using the original frontend types (no mapping needed!)
    const questionResults = []
    for (const [order_index, q] of questions.entries()) {
      console.log(`Processing question ${order_index + 1}:`, {
        description: q.description?.substring(0, 50) + '...',
        type: q.type,
        hasOptions: q.options?.length > 0
      })
      
      if (!q.description) {
        console.log(`⚠️ Question ${order_index + 1} skipped: no description`)
        continue // Skip empty questions
      }
      
      // Validate question type (no mapping - use frontend type directly)
      const questionType = q.type
      const isValidType = validateQuestionType(questionType)
      
      console.log(`Question type: '${questionType}' (valid: ${isValidType})`)
      
      if (!isValidType) {
        const validTypes = ['short_text', 'long_text', 'single_select', 'multi_select', 'composite']
        console.error(`❌ Invalid question type: '${questionType}'. Valid types:`, validTypes)
        questionResults.push({ 
          error: `Invalid question type: '${questionType}'. Valid types: ${validTypes.join(', ')}`, 
          question: q.description,
          order_index: order_index + 1
        })
        continue
      }
      
      const options = (questionType === 'single_select' || questionType === 'multi_select') 
        ? q.options?.filter((opt: string) => opt?.trim()) || []
        : []
      
      const questionData = {
        form_id: formData.id,
        question_text: q.description,
        question_type: questionType, // Use original frontend type directly
        is_required: q.isRequired || false,
        order_index,
        options: options.length ? JSON.stringify(options) : '[]',
        preset_question_id: q.preset_question_id || null,
      }
      
      console.log('Inserting question data:', {
        question_type: questionData.question_type,
        question_text: questionData.question_text?.substring(0, 50) + '...',
        options_count: options.length,
        order_index: questionData.order_index
      })
      
      const { data: insertedQuestion, error: questionError } = await supabase
        .from('form_questions')
        .insert([questionData])
        .select()

      if (questionError) {
        console.error(`❌ ERROR: Failed to create question ${order_index + 1}`)
        console.error('Error details:', questionError)
        console.error('Question data attempted:', questionData)
        console.error('Error code:', questionError.code)
        console.error('Error message:', questionError.message)
        
        questionResults.push({ 
          error: questionError.message, 
          question: q.description,
          order_index: order_index + 1,
          questionType: questionType,
          errorCode: questionError.code
        })
      } else {
        console.log(`✅ Question ${order_index + 1} created successfully`)
        questionResults.push({ success: true, data: insertedQuestion })
      }
    }

    // Log question creation summary
    const successfulQuestions = questionResults.filter(r => r.success).length
    const failedQuestions = questionResults.filter(r => r.error).length
    console.log(`📊 Question creation summary: ${successfulQuestions} successful, ${failedQuestions} failed`)

    // Create form assignments
    let assignmentResult = null
    if (assignments && assignments.length > 0) {
      console.log('Attempting to create assignments:', assignments.length)
      
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
        console.error('❌ Assignment creation error:', assignmentError)
        assignmentResult = { error: assignmentError.message }
      } else {
        console.log('✅ Successfully created', assignmentData?.length || 0, 'form assignments')
        assignmentResult = { success: true, data: assignmentData }
      }
    }

    // Provide comprehensive feedback
    const totalQuestions = questions?.length || 0
    const finalResult = {
      form: formData,
      questions: questionResults,
      assignments: assignmentResult,
      summary: {
        questionsAttempted: totalQuestions,
        questionsSuccessful: successfulQuestions,
        questionsFailed: failedQuestions,
        assignmentsCreated: assignmentResult?.data?.length || 0
      }
    }
    
    console.log('🎯 FINAL RESULT:', `${successfulQuestions} out of ${totalQuestions} questions created successfully`)
    
    return NextResponse.json({
      data: finalResult
    })
  } catch (error) {
    console.error('❌ Form creation API error:', error)
    return NextResponse.json({ 
      error: 'Failed to create form: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
} 