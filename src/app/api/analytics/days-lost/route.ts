import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all required data in parallel for better performance
    const [formsResponse, questionsResponse, responsesResponse] = await Promise.all([
      supabase.from('forms').select('*'),
      supabase.from('form_questions').select('id,form_id,question_type,question_text,sub_questions').eq('question_type', 'composite'),
      supabase.from('form_responses').select('id,form_id,submitted_at')
    ])

    // Filter for days lost related questions
    const daysLostQuestions = questionsResponse.data?.filter(q => 
      q.question_text && (
        q.question_text.toLowerCase().includes('days lost') ||
        q.question_text.toLowerCase().includes('weather') ||
        q.question_text.toLowerCase().includes('technical') ||
        q.question_text.toLowerCase().includes('other reasons')
      )
    ) || []

    if (formsResponse.error) {
      return NextResponse.json({ error: formsResponse.error.message }, { status: 400 })
    }
    if (questionsResponse.error) {
      return NextResponse.json({ error: questionsResponse.error.message }, { status: 400 })
    }
    if (responsesResponse.error) {
      return NextResponse.json({ error: responsesResponse.error.message }, { status: 400 })
    }

    const formsData = formsResponse.data || []
    const questionsData = daysLostQuestions
    const responsesData = responsesResponse.data || []

    // Get answers for all questions
    const questionIds = questionsData.map(q => q.id)
    const { data: answersData, error: answersError } = await supabase
      .from('form_response_answers')
      .select('response_id,question_id,answer')
      .in('question_id', questionIds)

    if (answersError) {
      return NextResponse.json({ error: answersError.message }, { status: 400 })
    }

    return NextResponse.json({
      data: {
        forms: formsData,
        questions: questionsData,
        responses: responsesData,
        answers: answersData || []
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data' 
    }, { status: 500 })
  }
} 