"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/app/UserProvider'

type Question = {
  id: number
  description: string
  type: string
  options: string[]
  isRequired: boolean
  usePreset: boolean
  preset_question_id: string
  answer_format: 'text' | 'number'
  sub_questions: Array<{
    question: string
    answer: string | number
  }>
}

export default function FormPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.id as string
  const [form, setForm] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const userContext = useUser()
  const user = userContext?.user ? { id: userContext.user.id, ...userContext.profile } : null

  useEffect(() => {
    const loadForm = async () => {
      if (!formId) return
      
      try {
        setLoading(true)
        
        // Fetch form data - initially without user filter to avoid loading delays
        const formQuery = supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
        
        // Add user filter only if user is loaded
        if (user?.id) {
          formQuery.eq('created_by', user.id)
        }
        
        const { data: formData, error: formError } = await formQuery.single()
        
        if (formError) throw formError
        
        // Fetch form questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('form_questions')
          .select('*')
          .eq('form_id', formId)
          .order('order_index')
        
        if (questionsError) throw questionsError
        
        // Security check: if user is loaded, ensure they own this form
        if (user?.id && formData.created_by !== user.id) {
          throw new Error('You do not have permission to view this form')
        }
        
        setForm(formData)
        
        // Convert questions to component format
        const loadedQuestions = questionsData?.map((q) => ({
          id: q.id,
          description: q.question_text,
          type: q.question_type,
          options: q.options ? JSON.parse(q.options) : ['', ''],
          isRequired: q.is_required,
          usePreset: !!q.preset_question_id,
          preset_question_id: q.preset_question_id || '',
          answer_format: q.answer_format || 'text',
          sub_questions: q.sub_questions ? JSON.parse(q.sub_questions) : [],
        })) || []
        
        setQuestions(loadedQuestions)
        
      } catch (error: any) {
        console.error('Error loading form:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadForm()
  }, [formId, user?.id])

  const handleBackToForms = () => {
    router.push('/dashboard/forms')
  }

  const handleEditForm = () => {
    router.push(`/dashboard/forms?edit=${formId}`)
  }

  if (loading || !formId) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
          <p className="mt-2 text-gray-600 font-inter">Loading form...</p>
        </div>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Form not found</h1>
          <p className="text-gray-600 mb-4">{error || 'The form you are looking for does not exist.'}</p>
          <button
            onClick={handleBackToForms}
            className="px-4 py-2 bg-[#FF6551] text-white rounded hover:bg-[#ff7a6b] font-inter"
          >
            Back to Forms
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToForms}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-inter"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Forms
            </button>
            <div>
              <h1 className="text-2xl font-semibold font-inter">{form.title}</h1>
              <p className="text-gray-600 font-inter">{form.description}</p>
            </div>
          </div>
          <button
            onClick={handleEditForm}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6551] text-white rounded hover:bg-[#ff7a6b] font-inter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit Form
          </button>
        </div>
      </div>

      {/* Form Preview Content */}
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold font-inter mb-2">{form.title}</h2>
              <p className="text-gray-600 font-inter">{form.description}</p>
              <div className="flex gap-4 mt-4 text-sm text-gray-500">
                <span>Module: {form.settings?.module || '-'}</span>
                <span>Due Date: {form.settings?.due_date || '-'}</span>
                <span>Questions: {questions.length}</span>
              </div>
            </div>

            {/* Form Questions Preview */}
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="border-l-4 border-[#FF6551] pl-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">Q{index + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{question.description}</p>
                      {question.isRequired && (
                        <span className="text-red-500 text-sm">*Required</span>
                      )}
                    </div>
                  </div>

                  {/* Question Preview */}
                  <div className="ml-6">
                    {question.type === 'short_text' && (
                      <input
                        className="w-full border border-gray-200 rounded px-3 py-2 font-inter text-sm bg-gray-50"
                        placeholder="Short text answer..."
                        disabled
                      />
                    )}
                    {question.type === 'long_text' && (
                      <textarea
                        className="w-full border border-gray-200 rounded px-3 py-2 font-inter text-sm h-20 bg-gray-50"
                        placeholder="Long text answer..."
                        disabled
                      />
                    )}
                    {(question.type === 'single_select' || question.type === 'multi_select') && (
                      <div className="space-y-2">
                        {question.options.filter(opt => opt.trim()).map((option, optIndex) => (
                          <label key={optIndex} className="flex items-center gap-2">
                            <input
                              type={question.type === 'single_select' ? 'radio' : 'checkbox'}
                              name={`question_${question.id}`}
                              disabled
                              className="text-[#FF6551]"
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {question.type === 'composite' && (
                      <div className="space-y-2">
                        {question.sub_questions.map((sub, subIndex) => (
                          <div key={subIndex} className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 min-w-0 flex-1">{sub.question}</span>
                            <input
                              type={question.answer_format === 'number' ? 'number' : 'text'}
                              className="w-32 border border-gray-200 rounded px-2 py-1 text-sm bg-gray-50"
                              value={sub.answer}
                              disabled
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 