"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/app/UserProvider'
import { useFilteredForms } from '@/hooks/useFilteredForms'
import FilterDrawer, { FilterOption } from '@/components/FilterDrawer'

type User = { id: string; [key: string]: any };

const formsColumns = [
  'Description', 'Site', 'Module', 'Responsible', 'Due'
]

type Form = {
  title: string
  description: string
  // Add more fields as needed
}

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

type PresetQuestion = {
  id: string
  label: string
  question_type: string
  description?: string
  answer_format?: 'text' | 'number'
  sub_questions?: string // JSON string
}

const formsData = [
  {
    description: 'No description',
    site: 'AAC Waterproofing Experts - Jenna Lee',
    module: 'Monitoring',
    responsible: 'Robert Fox',
    due: '12/01/2025',
  },
  // ...repeat or map for more rows as needed
]

export default function FormsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editParam = searchParams.get('edit')
  
  // Check for URL parameters to set initial view to prevent flash
  const viewResponsesParam = searchParams.get('viewResponses')
  const [view, setView] = useState<'table' | 'builder' | 'responses' | 'answers'>(
    viewResponsesParam ? 'responses' : 'table'
  )
  const [editingFormId, setEditingFormId] = useState<string | null>(editParam)
  const [viewingResponsesFormId, setViewingResponsesFormId] = useState<string | null>(null)
  const [viewingResponsesForm, setViewingResponsesForm] = useState<any>(null)
  const [formResponses, setFormResponses] = useState<any[]>([])
  const [formResponsesLoading, setFormResponsesLoading] = useState(false)
  const [viewingAnswersUser, setViewingAnswersUser] = useState<any>(null)
  const [viewingAnswersResponse, setViewingAnswersResponse] = useState<any>(null)
  const [viewingAnswersForm, setViewingAnswersForm] = useState<any>(null)
  const [formQuestions, setFormQuestions] = useState<any[]>([])
  const [answersLoading, setAnswersLoading] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      description: '',
      type: '',
      options: ['', ''],
      isRequired: false,
      usePreset: false,
      preset_question_id: '',
      answer_format: 'text',
      sub_questions: [],
    },
  ])
  const [module, setModule] = useState('Monitoring')
  const [moduleFilter, setModuleFilter] = useState('All')
  const [personFilter, setPersonFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const userContext = useUser()
  const user = userContext?.user ? { id: userContext.user.id, ...userContext.profile } : null
  const [presetQuestions, setPresetQuestions] = useState<PresetQuestion[]>([])
  const [questionTypeOptions, setQuestionTypeOptions] = useState<string[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<{id: string, email: string, first_name?: string, last_name?: string}[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])

  // Use the filtered forms hook
  const { 
    forms, 
    loading: formsLoading, 
    error: formsError, 
    availableUsers, 
    availableModules,
    total,
    refetch
  } = useFilteredForms({
    module: moduleFilter !== 'All' ? moduleFilter : undefined,
    userId: personFilter !== 'All' ? personFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
    adminId: user?.id
  })

  // No need for manual filtering anymore - it's handled by the API
  const filteredForms = forms

  // Pagination logic
  const totalPages = Math.ceil(forms.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedForms = forms.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [moduleFilter, personFilter, dateFrom, dateTo, search])

  // Forms are now fetched via useFilteredForms hook

  // Fetch question types from enum
  useEffect(() => {
    const fetchQuestionTypes = async () => {
      // Use actual database enum values from what's currently in the database
      setQuestionTypeOptions([
        'short_text', 'long_text', 'single_select', 'multi_select', 'composite'
      ])
    }
    fetchQuestionTypes()
  }, [])

  // Fetch preset questions for current admin
  useEffect(() => {
    const fetchPresetQuestions = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('preset_questions')
        .select('*')
        .eq('admin_id', user.id)
      if (!error && data) {
        setPresetQuestions(data as PresetQuestion[])
      }
    }
    fetchPresetQuestions()
  }, [user])

  // Fetch available employees for current admin
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user?.id) return
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('role', 'employee')
        .eq('invited_by', user.id)
        .eq('status', 'active')
      if (!error && data) {
        setAvailableEmployees(data)
      }
    }
    fetchEmployees()
  }, [user?.id])

  // Handle edit parameter from URL
  useEffect(() => {
    if (editParam && editParam !== editingFormId && view === 'table') {
      handleEditForm(editParam)
    }
  }, [editParam, view])

  // Handle viewResponses parameter from URL
  useEffect(() => {
    if (viewResponsesParam && forms.length > 0 && view === 'responses' && !viewingResponsesFormId) {
      // Only handle the viewResponses parameter if we're in responses view but don't have data yet
      handleViewResponses(viewResponsesParam)
    }
  }, [searchParams, forms, view, viewingResponsesFormId])

  const handleAddNewForm = () => {
    // Reset form state for new form
    setEditingFormId(null)
    setFormTitle('')
    setFormDescription('')
    setFormDueDate('')
    setModule('Monitoring')
    setSelectedEmployees([])
    setQuestions([
      {
        id: 1,
        description: '',
        type: '',
        options: ['', ''],
        isRequired: false,
        usePreset: false,
        preset_question_id: '',
        answer_format: 'text',
        sub_questions: [],
      },
    ])
    setView('builder')
  }
  
  const handleEditForm = async (formId: string) => {
    try {
      // Fetch form data
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single()
      
      if (formError) throw formError
      
      // Fetch form questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('form_questions')
        .select('*')
        .eq('form_id', formId)
        .order('order_index')
      
      if (questionsError) throw questionsError
      
      // Load form data into state
      setEditingFormId(formId)
      setFormTitle(formData.title || '')
      setFormDescription(formData.description || '')
      setFormDueDate(formData.settings?.due_date || '')
      setModule(formData.settings?.module || 'Monitoring')
      setSelectedEmployees(formData.metadata?.assigned_employees || [])
      
      // Convert questions to component format
      const loadedQuestions = questionsData?.map((q, index) => ({
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
      
      setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [
        {
          id: 1,
          description: '',
          type: '',
          options: ['', ''],
          isRequired: false,
          usePreset: false,
          preset_question_id: '',
          answer_format: 'text',
          sub_questions: [],
        },
      ])
      
      setView('builder')
    } catch (error) {
      console.error('Error loading form:', error)
      alert('Error loading form for editing')
    }
  }
  
  const handleDeleteForm = async (formId: string, formTitle: string) => {
    if (!confirm(`Are you sure you want to delete the form "${formTitle}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      // Delete form questions first
      const { error: questionsError } = await supabase
        .from('form_questions')
        .delete()
        .eq('form_id', formId)
      
      if (questionsError) throw questionsError
      
      // Delete form assignments
      const { error: assignmentsError } = await supabase
        .from('form_assignments')
        .delete()
        .eq('form_id', formId)
      
      if (assignmentsError) throw assignmentsError
      
      // Delete form
      const { error: formError } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId)
      
      if (formError) throw formError
      
      alert('Form deleted successfully')
      refetch() // Refresh the forms list
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Error deleting form')
    }
  }
  
  const handleBackToTable = () => {
    // Clear URL parameters to prevent getting stuck in responses view
    router.push('/dashboard/forms')
    setView('table')
    setEditingFormId(null)
    setViewingResponsesFormId(null)
    setViewingResponsesForm(null)
    setFormResponses([])
    setViewingAnswersUser(null)
    setViewingAnswersResponse(null)
    setViewingAnswersForm(null)
    setFormQuestions([])
    // Refetch forms when returning from form builder
    refetch()
  }
  
  const handleSaveForm = (newForm: Form) => {
    // Form is automatically added via the API and useFilteredForms will refetch
    setView('table')
    setEditingFormId(null)
    // Refetch forms to show the newly created form
    refetch()
  }

  const handleQuestionChange = (id: number, field: keyof Question, value: any) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          return { ...q, [field]: value }
        }
        return q
      })
    )
  }

  const handleOptionChange = (qid: number, idx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((opt, i) => (i === idx ? value : opt)) }
          : q
      )
    )
  }

  const addOption = (qid: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, ''] } : q
      )
    )
  }

  const removeOption = (qid: number, idx: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.filter((_, i) => i !== idx) }
          : q
      )
    )
  }

  const addQuestion = (isPreset = false) => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: '',
        type: '',
        options: ['', ''],
        isRequired: false,
        usePreset: isPreset,
        preset_question_id: '',
        answer_format: 'text',
        sub_questions: [],
      },
    ])
  }

  const removeQuestion = (qid: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qid))
  }

  const copyQuestion = (qid: number) => {
    const questionToCopy = questions.find(q => q.id === qid)
    if (questionToCopy) {
      const copiedQuestion = {
        ...questionToCopy,
        id: Date.now(), // Generate new unique ID
        description: questionToCopy.description + ' (Copy)',
      }
      setQuestions((prev) => {
        const index = prev.findIndex(q => q.id === qid)
        const newQuestions = [...prev]
        newQuestions.splice(index + 1, 0, copiedQuestion)
        return newQuestions
      })
    }
  }

  // New handlers for composite questions and answer format
  const handleAnswerFormatChange = (qid: number, format: 'text' | 'number') => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, answer_format: format } : q
      )
    )
  }

  const handleSubQuestionAdd = (qid: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
              ...q,
              sub_questions: [
                ...q.sub_questions,
                { question: '', answer: q.answer_format === 'number' ? 0 : '' }
              ]
            }
          : q
      )
    )
  }

  const handleSubQuestionChange = (qid: number, subIndex: number, field: 'question' | 'answer', value: string | number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
              ...q,
              sub_questions: q.sub_questions.map((sub, idx) =>
                idx === subIndex ? { ...sub, [field]: value } : sub
              )
            }
          : q
      )
    )
  }

  const handleSubQuestionRemove = (qid: number, subIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
              ...q,
              sub_questions: q.sub_questions.filter((_, idx) => idx !== subIndex)
            }
          : q
      )
    )
  }

  const handleWorkDaysPreset = (qid: number) => {
    const workDaysPreset = [
      { question: 'Weather', answer: 0 },
      { question: 'Technical problems', answer: 0 },
      { question: 'Other reasons', answer: 0 }
    ]
    
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
              ...q,
              sub_questions: workDaysPreset,
              answer_format: 'number'
            }
          : q
      )
    )
  }

  // Preset question functions
  const handlePresetToggle = (qid: number, usePreset: boolean) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
              ...q,
              usePreset,
              preset_question_id: '',
              description: usePreset ? '' : q.description,
              type: usePreset ? '' : q.type,
            }
          : q
      )
    )
  }

  const handlePresetSelect = (qid: number, presetId: string) => {
    const preset = presetQuestions.find((p) => p.id === presetId)
    if (preset) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qid
            ? {
                ...q,
                preset_question_id: presetId,
                description: preset.label,
                type: preset.question_type,
                answer_format: preset.answer_format || 'text',
                sub_questions: preset.sub_questions ? JSON.parse(preset.sub_questions) : [],
              }
            : q
        )
      )
    }
  }

  const handleSaveAsPreset = async (q: Question) => {
    if (!user || !q.description || !q.type) {
      alert('Please fill in description and type before saving as preset')
      return
    }

    try {
      // Prepare the preset data
      const presetData = {
        admin_id: user.id,
        label: q.description,
        question_type: q.type,
        description: q.description,
      }

      // For composite questions, we need to save additional data
      if (q.type === 'composite' && q.sub_questions.length > 0) {
        // Add answer_format and sub_questions if the table supports them
        const extendedData = {
          ...presetData,
          answer_format: q.answer_format,
          sub_questions: JSON.stringify(q.sub_questions)
        }
        
        const { error } = await supabase.from('preset_questions').insert(extendedData)
        
        if (error) {
          // If the extended insert fails, try with basic data only
          console.warn('Extended preset insert failed, trying basic:', error.message)
          const { error: basicError } = await supabase.from('preset_questions').insert(presetData)
          if (basicError) {
            throw basicError
          }
        }
      } else {
        // Regular question types
        const { error } = await supabase.from('preset_questions').insert(presetData)
        if (error) {
          throw error
        }
      }

      alert('Question saved as preset!')
      // Refresh preset questions
      const { data } = await supabase
        .from('preset_questions')
        .select('*')
        .eq('admin_id', user.id)
      if (data) setPresetQuestions(data as PresetQuestion[])
      
    } catch (error: any) {
      console.error('Error saving preset:', error)
      alert('Error saving preset: ' + error.message)
    }
  }

  const handleCreateForm = async () => {
    if (!user) {
      alert('You must be logged in to create a form')
      return
    }

    // Use controlled state values
    const title = formTitle.trim()
    const description = formDescription.trim()
    const dueDate = formDueDate
    
    // Validation
    if (!title) {
      alert('Please enter a form title')
      return
    }
    if (questions.length === 0 || questions.every(q => !q.description)) {
      alert('Please add at least one question')
      return
    }
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee to assign this form to')
      return
    }

    try {
      // Get full employee objects for the selected employees
      const selectedEmployeeObjects = selectedEmployees.map(employeeId => {
        const employee = availableEmployees.find(e => e.id === employeeId);
        return employee ? {
          id: employee.id,
          name: employee.first_name && employee.last_name 
            ? `${employee.first_name} ${employee.last_name}`
            : employee.email,
          email: employee.email,
          first_name: employee.first_name,
          last_name: employee.last_name
        } : null;
      }).filter(Boolean);

      let formData: any

      if (editingFormId) {
        // Update existing form
        const { data: updatedFormData, error: formError } = await supabase
          .from('forms')
          .update({
            title,
            description,
            settings: { module, due_date: dueDate },
            metadata: { 
              assigned_employee_count: selectedEmployees.length,
              assigned_employees: selectedEmployees,
              users: selectedEmployeeObjects
            },
          })
          .eq('id', editingFormId)
          .select()
          .single()

        if (formError) {
          alert('Error updating form: ' + formError.message)
          console.error(formError)
          return
        }

        formData = updatedFormData

        // Delete existing questions
        const { error: deleteError } = await supabase
          .from('form_questions')
          .delete()
          .eq('form_id', editingFormId)

        if (deleteError) {
          console.error('Error deleting old questions:', deleteError)
        }

        // Note: form_assignments table doesn't exist yet, assignments are stored in metadata

      } else {
        // Create new form
        const { data: newFormData, error: formError } = await supabase
          .from('forms')
          .insert([
            {
              title,
              description,
              created_by: user.id,
              settings: { module, due_date: dueDate },
              metadata: { 
                assigned_employee_count: selectedEmployees.length,
                assigned_employees: selectedEmployees,
                users: selectedEmployeeObjects
              },
            },
          ])
          .select()
          .single()

        if (formError) {
          alert('Error creating form: ' + formError.message)
          console.error(formError)
          return
        }

        formData = newFormData
      }

      // Insert questions (same for both create and update)
      let questionErrors = 0
      for (let order_index = 0; order_index < questions.length; order_index++) {
        const q = questions[order_index]
        if (!q.description) continue // Skip empty questions
        
        let options = (q.type === 'single_select' || q.type === 'multi_select') ? q.options.filter((opt: string) => opt.trim()) : []
        let question_type = q.type
        
        const { error: questionError } = await supabase.from('form_questions').insert([
          {
            form_id: formData.id,
            question_text: q.description,
            question_type,
            is_required: q.isRequired,
            order_index,
            options: options.length ? JSON.stringify(options) : '[]',
            preset_question_id: q.preset_question_id || null,
            answer_format: q.answer_format || 'text',
            sub_questions: q.sub_questions && q.sub_questions.length > 0 ? JSON.stringify(q.sub_questions) : '[]',
          },
        ])
        
        if (questionError) {
          console.error('Error creating question:', questionError)
          questionErrors++
        }
      }

      // Note: form_assignments table doesn't exist yet, assignments are stored in metadata
      // TODO: Once form_assignments table is created, uncomment this code
      /*
      const assignments = selectedEmployees.map(employeeId => ({
        form_id: formData.id,
        employee_id: employeeId,
        assigned_by: user.id,
        status: 'pending' as const,
        due_date: dueDate || null,
      }))

      const { error: assignmentError } = await supabase
        .from('form_assignments')
        .insert(assignments)

      if (assignmentError) {
        console.error('Error creating assignments:', assignmentError)
        if (editingFormId) {
          alert('Form updated but there was an error updating employee assignments: ' + assignmentError.message)
        } else {
          alert('Form created but there was an error assigning it to employees: ' + assignmentError.message)
        }
      } else {
        if (editingFormId) {
          alert('Form updated successfully!')
        } else {
          alert(`Form created successfully and assigned to ${selectedEmployees.length} employee(s)!`)
        }
      }
      */

      // For now, just show success message
      if (editingFormId) {
        alert('Form updated successfully!')
      } else {
        alert(`Form created successfully and assigned to ${selectedEmployees.length} employee(s)!`)
      }

      if (questionErrors > 0) {
        alert(`Warning: ${questionErrors} question(s) failed to save`)
      }

      // Reset form and return to table view
      setView('table')
      setEditingFormId(null)
      setFormTitle('')
      setFormDescription('')
      setFormDueDate('')
      setQuestions([
        {
          id: 1,
          description: '',
          type: '',
          options: ['', ''],
          isRequired: false,
          usePreset: false,
          preset_question_id: '',
          answer_format: 'text',
          sub_questions: [],
        },
      ])
      setSelectedEmployees([])
      setModule('Monitoring')
      
      // Forms will be automatically refetched by the useFilteredForms hook
      refetch()

    } catch (error) {
      console.error('Unexpected error:', error)
      alert(`An unexpected error occurred while ${editingFormId ? 'updating' : 'creating'} the form`)
    }
  }

  const handleEmployeeSelection = (employeeId: string, selected: boolean) => {
    if (selected) {
      setSelectedEmployees(prev => [...prev, employeeId])
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId))
    }
  }

  const handleViewResponses = async (formId: string) => {
    try {
      setFormResponsesLoading(true)
      setViewingResponsesFormId(formId)
      
      // Get form details
      const form = forms.find(f => f.id === formId)
      setViewingResponsesForm(form)

      // Get form responses and answers
      const { data: responses, error: responsesError } = await supabase
        .from('form_responses')
        .select(`
          *,
          form_response_answers (
            *,
            form_questions (
              id,
              question_text,
              question_type,
              order_index
            )
          )
        `)
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false })

      if (responsesError) throw responsesError

      // Get assigned employees from form metadata
      const assignedEmployees = form?.metadata?.assigned_employees || []
      
      // Get profiles for assigned employees
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', assignedEmployees.length > 0 ? assignedEmployees : [''])

      if (profilesError) throw profilesError

      // Combine assignments with responses
      const combinedData = assignedEmployees.map(employeeId => {
        const profile = profiles?.find(p => p.id === employeeId)
        const response = responses?.find(r => r.respondent_id === employeeId)
        return {
          employee_id: employeeId,
          response: response || null,
          user: profile || { id: employeeId, email: 'Unknown User' }
        }
      })

      setFormResponses(combinedData)
      setView('responses')
    } catch (error) {
      console.error('Error fetching form responses:', error)
      alert('Error loading form responses')
    } finally {
      setFormResponsesLoading(false)
    }
  }

  const handleViewIndividualAnswers = async (formId: string, userId: string, userResponse: any) => {
    try {
      setAnswersLoading(true)
      
      // Get form details
      const form = forms.find(f => f.id === formId)
      setViewingAnswersForm(form)
      
      // Get user details
      const user = formResponses.find(r => r.employee_id === userId)?.user
      setViewingAnswersUser(user)
      
      // Set the response data
      setViewingAnswersResponse(userResponse)
      
      // Get form questions for better display
      const { data: questionsData, error: questionsError } = await supabase
        .from('form_questions')
        .select('*')
        .eq('form_id', formId)
        .order('order_index')
      
      if (questionsError) throw questionsError
      setFormQuestions(questionsData || [])
      
      setView('answers')
    } catch (error) {
      console.error('Error loading individual answers:', error)
      alert('Error loading individual answers')
    } finally {
      setAnswersLoading(false)
    }
  }

  const formatResponseAnswer = (answer: any, questionType: string) => {
    if (!answer) return '-'
    
    try {
      const answerData = typeof answer === 'string' ? JSON.parse(answer) : answer
      
      if (questionType === 'composite') {
        // Handle composite questions (like days lost)
        if (typeof answerData === 'object' && answerData !== null) {
          return Object.entries(answerData)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')
        }
      }
      
      return answerData?.toString() || '-'
    } catch (error) {
      return answer?.toString() || '-'
    }
  }

  const getCompletionStatus = (responses: any[]) => {
    const completed = responses.filter(r => r.response).length
    const total = responses.length
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }

  return (
    <div className="space-y-8">
      {view === 'table' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold font-inter">Forms</h2>
              <span className="bg-[#F2F2F2] text-[#272937] text-xs font-medium font-inter rounded px-3 py-1">Total {forms.length} forms</span>
            </div>
            <button
              className="flex items-center gap-2 bg-[#FF6551] text-white font-semibold rounded-full px-6 py-2 shadow hover:bg-[#ff7a6b] focus:outline-none focus:ring-2 focus:ring-[#FF6551]"
              aria-label="Add new form"
              tabIndex={0}
              onClick={handleAddNewForm}
            >
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add new form
            </button>
          </div>
          {/* Mobile filter button */}
          <div className="sm:hidden mb-4">
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="flex items-center gap-2 w-full sm:w-auto bg-white border border-[#E5E7EB] text-gray-700 font-medium rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {(moduleFilter !== 'All' || personFilter !== 'All' || dateFrom || dateTo || search) && (
                <span className="bg-[#FF6551] text-white text-xs rounded-full px-2 py-0.5 ml-1">
                  {[moduleFilter !== 'All', personFilter !== 'All', dateFrom, dateTo, search].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Desktop filter controls */}
          <div className="hidden sm:flex sm:justify-end gap-3 mb-4">
            {/* Module Dropdown */}
            <select
              className="w-[160px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
            >
              <option value="All">All Modules</option>
              {availableModules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
            {/* Persons Dropdown */}
            <select
              className="w-[180px] h-[36px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-10 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
              value={personFilter}
              onChange={e => setPersonFilter(e.target.value)}
            >
              <option value="All">All Persons</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.email
                  }
                </option>
              ))}
            </select>
            {/* Date Range */}
            <input
              type="date"
              className="h-[36px] w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="h-[36px] w-[140px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
            {/* Search */}
            <input
              type="search"
              placeholder="Search"
              className="h-[36px] min-w-[200px] rounded-[8px] border border-[#2729371F] bg-white pl-4 pr-4 text-[14px] font-inter font-normal text-[#27293759] focus:text-[#272937] placeholder:text-[#27293759] focus:outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm font-inter">
              <thead>
                <tr className="bg-[#F2F2F2]">
                  <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Title</th>
                  <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Description</th>
                  <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Module</th>
                  <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Due Date</th>
                  <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Users</th>
                  <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Questions</th>
                  <th className="px-3 py-3 sm:px-4 sm:py-2 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {formsLoading && (
                  <tr><td colSpan={7} className="px-3 py-4 sm:px-4 sm:py-2 text-center">Loading...</td></tr>
                )}
                {formsError && (
                  <tr><td colSpan={7} className="px-3 py-4 sm:px-4 sm:py-2 text-center text-red-500">{formsError}</td></tr>
                )}
                {!formsLoading && !formsError && filteredForms.length === 0 && (
                                      <tr><td colSpan={7} className="px-3 py-4 sm:px-4 sm:py-2 text-center">No forms found.</td></tr>
                )}
                {!formsLoading && !formsError && paginatedForms.map((form) => (
                  <tr key={form.id} className="border-b last:border-0">
                    <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                      <button
                        onClick={() => handleViewResponses(form.id)}
                        className="text-[#FF6551] hover:text-[#ff7a6b] hover:underline font-medium cursor-pointer text-left"
                      >
                        {form.title}
                      </button>
                    </td>
                    <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.description}</td>
                    <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.settings?.module || '-'}</td>
                    <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.settings?.due_date || '-'}</td>
                    <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">
                      {(() => {
                        // Check if we have user objects in metadata
                        if (Array.isArray(form.metadata?.users) && form.metadata.users.length > 0) {
                          return form.metadata.users.map((u: any) => u.name || u.email).join(', ')
                        }
                        // Fallback to assigned_employees count if available
                        if (form.metadata?.assigned_employee_count) {
                          return `${form.metadata.assigned_employee_count} employee${form.metadata.assigned_employee_count !== 1 ? 's' : ''}`
                        }
                        return '-'
                      })()}
                    </td>
                    <td className="px-3 py-4 sm:px-4 sm:py-2 text-gray-700">{form.questionCount}</td>
                    <td className="px-3 py-4 sm:px-4 sm:py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditForm(form.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Form"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleViewResponses(form.id)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="View Responses"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteForm(form.id, form.title || form.description)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Form"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {!formsLoading && !formsError && forms.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, forms.length)} of {forms.length} forms
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === page
                          ? 'bg-[#FF6551] text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : view === 'responses' ? (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
          {/* Sticky Top Bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  onClick={handleBackToTable}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 font-inter text-sm sm:text-base"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Forms
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold font-inter text-gray-900 truncate">Form Responses</h1>
                  <p className="text-sm sm:text-base text-gray-600 font-inter truncate">
                    {viewingResponsesForm?.title || 'Form Responses'}
                  </p>
                </div>
              </div>
              {formResponses.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                    {(() => {
                      const status = getCompletionStatus(formResponses)
                      return `${status.completed}/${status.total} completed (${status.percentage}%)`
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Responses Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {formResponsesLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
                  <p className="mt-2 text-gray-600 font-inter">Loading responses...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Response Summary */}
                {formResponses.length > 0 && (
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold font-inter mb-4">Response Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-left">
                        <div className="text-2xl font-bold text-green-600">
                          {getCompletionStatus(formResponses).completed}
                        </div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-bold text-orange-600">
                          {getCompletionStatus(formResponses).total - getCompletionStatus(formResponses).completed}
                        </div>
                        <div className="text-sm text-gray-600">Pending</div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-bold text-blue-600">
                          {getCompletionStatus(formResponses).percentage}%
                        </div>
                        <div className="text-sm text-gray-600">Completion Rate</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Responses */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold font-inter">Individual Responses</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submitted
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formResponses.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.user?.first_name && item.user?.last_name
                                      ? `${item.user.first_name} ${item.user.last_name}`
                                      : item.user?.email || 'Unknown User'}
                                  </div>
                                  {item.user?.first_name && item.user?.last_name && (
                                    <div className="text-sm text-gray-500">{item.user.email}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.response 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {item.response ? 'Completed' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.response?.submitted_at 
                                ? new Date(item.response.submitted_at).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {item.response && (
                                <button
                                  onClick={() => handleViewIndividualAnswers(viewingResponsesFormId!, item.employee_id, item.response)}
                                  className="text-[#FF6551] hover:text-[#ff7a6b] font-inter font-medium"
                                >
                                  View Answers
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
             ) : view === 'answers' ? (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
          {/* Sticky Top Bar */}
           <div className="sticky top-0 z-20 w-full bg-white border-b shadow-sm p-4 sm:p-6">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 max-w-4xl mx-auto">
               <button 
                 onClick={() => setView('responses')} 
                 className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 font-inter text-sm sm:text-base self-start"
               >
                 <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                 </svg>
                 Back to Responses
               </button>
               <div className="text-center sm:flex-1 min-w-0">
                 <h1 className="text-lg sm:text-xl font-semibold font-inter text-gray-900 truncate">{viewingAnswersForm?.title || 'Form Answers'}</h1>
                 <p className="text-sm text-gray-600 font-inter truncate">
                   {viewingAnswersUser?.first_name && viewingAnswersUser?.last_name
                     ? `${viewingAnswersUser.first_name} ${viewingAnswersUser.last_name}`
                     : viewingAnswersUser?.email || 'Unknown User'}
                 </p>
               </div>
               <div className="hidden sm:block w-[120px]"></div> {/* Spacer for center alignment on desktop only */}
             </div>
           </div>

           {/* Answers Content */}
           <div className="flex-1 flex justify-center items-start py-4 sm:py-6 lg:py-8 overflow-y-auto bg-[#F8F9FA] px-4 sm:px-6">
             {answersLoading ? (
               <div className="flex items-center justify-center h-64">
                 <div className="text-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
                   <p className="mt-2 text-gray-600 font-inter">Loading answers...</p>
                 </div>
               </div>
             ) : (
               <div className="w-full max-w-3xl">
                 {/* User Info Card */}
                 <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 mb-6">
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                     <div className="min-w-0 flex-1">
                       <h3 className="text-base sm:text-lg font-semibold font-inter text-gray-900 truncate">
                         {viewingAnswersUser?.first_name && viewingAnswersUser?.last_name
                           ? `${viewingAnswersUser.first_name} ${viewingAnswersUser.last_name}`
                           : viewingAnswersUser?.email || 'Unknown User'}
                       </h3>
                       {viewingAnswersUser?.first_name && viewingAnswersUser?.last_name && (
                         <p className="text-sm text-gray-600 font-inter truncate">{viewingAnswersUser.email}</p>
                       )}
                     </div>
                     <div className="text-left sm:text-right flex-shrink-0">
                       <div className="text-sm font-medium text-green-600">Completed</div>
                       <div className="text-xs text-gray-500">
                         {viewingAnswersResponse?.submitted_at 
                           ? new Date(viewingAnswersResponse.submitted_at).toLocaleDateString()
                           : '-'}
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Questions and Answers */}
                 <div className="space-y-4 sm:space-y-6">
                   {viewingAnswersResponse?.form_response_answers
                     ?.sort((a: any, b: any) => (a.form_questions?.order_index || 0) - (b.form_questions?.order_index || 0))
                     .map((answerData: any, index: number) => {
                       const question = answerData.form_questions
                       const answer = answerData.answer
                       
                       return (
                         <div key={index} className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-white">
                           <div className="mb-4">
                             <span className="text-xs text-gray-500 font-inter">Question {index + 1}</span>
                             <h4 className="text-base sm:text-lg font-medium font-inter text-gray-900 mt-1">
                               {question?.question_text || 'Question'}
                             </h4>
                             {question?.is_required && (
                               <span className="text-xs text-red-500 font-inter">Required</span>
                             )}
                           </div>
                           
                           <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                             <label className="text-sm text-gray-600 font-inter mb-2 block">Answer</label>
                             {(() => {
                               const questionType = question?.question_type
                               
                               if (questionType === 'composite') {
                                 try {
                                   const answerObj = typeof answer === 'string' ? JSON.parse(answer) : answer
                                   if (typeof answerObj === 'object' && answerObj !== null) {
                                     return (
                                       <div className="space-y-2">
                                         {Object.entries(answerObj).map(([key, value]) => (
                                           <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-3 rounded border gap-1 sm:gap-0">
                                             <span className="text-sm font-medium text-gray-700 break-words">{key}</span>
                                             <span className="text-sm text-gray-900 font-mono break-all">{value as string}</span>
                                           </div>
                                         ))}
                                       </div>
                                     )
                                   }
                                 } catch (e) {
                                   // fallback
                                 }
                               }
                               
                               if (questionType === 'single_select' || questionType === 'multi_select') {
                                 try {
                                   const answerArray = Array.isArray(answer) ? answer : [answer]
                                   return (
                                     <div className="space-y-2">
                                       {answerArray.map((item: any, idx: number) => (
                                         <div key={idx} className="bg-white p-3 rounded border">
                                           <span className="text-sm text-gray-900">{item}</span>
                                         </div>
                                       ))}
                                     </div>
                                   )
                                 } catch (e) {
                                   // fallback
                                 }
                               }
                               
                               // Default text display
                               return (
                                 <div className="bg-white p-3 rounded border">
                                   <span className="text-sm text-gray-900 whitespace-pre-wrap">
                                     {answer ? answer.toString() : 'No answer provided'}
                                   </span>
                                 </div>
                               )
                             })()}
                           </div>
                         </div>
                       )
                     })}
                 </div>
               </div>
             )}
           </div>
         </div>
      ) : (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
          {/* Mobile-optimized header */}
          <div className="sticky top-0 sm:top-0 z-10 w-full self-start flex flex-col sm:flex-row justify-between items-stretch sm:items-center px-4 sm:px-8 py-2 sm:py-4 bg-white border-b shadow-sm gap-3 sm:gap-0">
            {/* Back button - separate */}
            <button onClick={handleBackToTable} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded bg-gray-100 hover:bg-gray-200 font-inter font-medium text-sm sm:text-base self-start">
              Back
            </button>
            
            {/* Form action buttons - grouped */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button onClick={handleBackToTable} className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded border border-gray-300 bg-white hover:bg-gray-100 font-inter font-medium text-xs sm:text-sm">
                Discard Changes
              </button>
              <button className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded border border-gray-300 bg-white hover:bg-gray-100 font-inter font-medium text-xs sm:text-sm">
                Preview Form
              </button>
              <button onClick={handleCreateForm} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded bg-[#FF6551] text-white font-inter font-semibold hover:bg-[#ff7a6b] text-xs sm:text-sm">
                {editingFormId ? 'Save Form' : 'Create Form'}
              </button>
            </div>
          </div>
          {/* Centered form builder card with reduced mobile padding */}
          <div className="flex-1 flex justify-center items-start py-4 sm:py-8 overflow-y-auto bg-[#F8F9FA]">
            <div className="w-full max-w-3xl p-4 sm:p-8 mx-2 sm:mx-8">
              {/* Form builder content */}
              <input 
                className="w-full border border-gray-200 rounded px-3 py-2.5 sm:px-4 sm:py-3 font-inter text-base sm:text-lg mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent" 
                placeholder="Form Title"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
              />
              <textarea 
                className="w-full border border-gray-200 rounded px-3 py-2.5 sm:px-4 sm:py-3 font-inter mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent min-h-[60px] sm:min-h-[80px] text-sm sm:text-base" 
                placeholder="No description"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
              {/* Module and Due Date - mobile responsive layout */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-xs mb-1 font-inter">Select Module</label>
                  <select className="w-full border border-gray-200 rounded px-3 py-2.5 sm:px-4 sm:py-3 font-inter bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent text-sm sm:text-base" value={module} onChange={e => setModule(e.target.value)}>
                    <option value="Monitoring">Monitoring</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1 font-inter">Due Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-200 rounded px-3 py-2.5 sm:px-4 sm:py-3 font-inter bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent text-sm sm:text-base"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs mb-1 font-inter">Users</label>
                {availableEmployees.length === 0 ? (
                  <div className="border border-gray-200 rounded px-4 py-3 bg-gray-50">
                    <p className="text-gray-500 text-sm font-inter">No employees available. Please invite employees first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Selected Users Display */}
                    {selectedEmployees.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployees.map(employeeId => {
                          const employee = availableEmployees.find(e => e.id === employeeId);
                          if (!employee) return null;
                          const displayName = employee.first_name && employee.last_name 
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.email;
                          return (
                            <span key={employeeId} className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6551] text-white text-sm rounded-full">
                              {displayName}
                              <button
                                type="button"
                                className="text-white hover:text-gray-200 focus:outline-none"
                                onClick={() => handleEmployeeSelection(employeeId, false)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Available Users Dropdown */}
                    <div className="border border-gray-200 rounded-lg bg-white">
                      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                        <span className="text-xs text-gray-600 font-inter font-medium">Available Team Members</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {availableEmployees.map(employee => {
                          const isSelected = selectedEmployees.includes(employee.id);
                          const displayName = employee.first_name && employee.last_name 
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.email;
                          
                          return (
                            <button
                              key={employee.id}
                              type="button"
                              className={`w-full text-left px-4 py-2 text-sm font-inter hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors ${
                                isSelected ? 'bg-[#FF6551]/10 text-[#FF6551]' : 'text-gray-700'
                              }`}
                              onClick={() => handleEmployeeSelection(employee.id, !isSelected)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{displayName}</div>
                                  {employee.first_name && employee.last_name && (
                                    <div className="text-xs text-gray-500">{employee.email}</div>
                                  )}
                                </div>
                                {isSelected && (
                                  <svg className="w-4 h-4 text-[#FF6551]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {selectedEmployees.length > 0 && (
                      <p className="text-xs text-gray-500 font-inter">
                        {selectedEmployees.length} of {availableEmployees.length} team member{selectedEmployees.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Questions */}
              <div className="space-y-8">
                {questions.map((q, idx) => (
                  <div key={q.id} className="relative mb-2">
                    <div className="border border-gray-200 rounded-xl p-4 sm:p-6 bg-white relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500 font-inter">
                        Question {idx + 1}
                      </span>
                      <div className="flex gap-2">
                        {!q.usePreset && (
                          <button 
                              className={`px-2 py-1 sm:px-3 sm:py-1 text-xs rounded font-inter ${
                              q.description && q.type
                                ? 'bg-[#FF6551] text-white hover:bg-[#ff7a6b]'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            onClick={() => q.description && q.type && handleSaveAsPreset(q)}
                            disabled={!q.description || !q.type}
                          >
                            Save as Preset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preset Dropdown (when usePreset is true) */}
                    {q.usePreset && (
                                              <div className="mb-4">
                          <label className="block text-xs mb-1 font-inter text-gray-600">Select Preset Question</label>
                          <select
                          className="w-full border border-gray-200 rounded px-3 py-2.5 sm:px-4 sm:py-3 font-inter text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
                            value={q.preset_question_id}
                            onChange={e => handlePresetSelect(q.id, e.target.value)}
                          >
                            <option value="">Choose a preset question...</option>
                            {presetQuestions.map(preset => (
                              <option key={preset.id} value={preset.id}>{preset.label}</option>
                            ))}
                          </select>
                        </div>
                    )}

                    {/* Regular Question Input (when not using preset) */}
                    {!q.usePreset && (
                      <>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                          <input
                            className="flex-1 border border-gray-200 rounded px-3 py-2.5 sm:px-4 sm:py-3 font-inter text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
                            placeholder="Add description"
                            value={q.description}
                            onChange={e => handleQuestionChange(q.id, 'description', e.target.value)}
                          />
                          <select
                            className="w-full sm:w-[240px] border border-gray-200 rounded px-3 py-2.5 sm:px-4 sm:py-3 font-inter text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
                            value={q.type}
                            onChange={e => handleQuestionChange(q.id, 'type', e.target.value)}
                          >
                            <option value="">Select type</option>
                            {questionTypeOptions.map(type => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Answer Format Selector (for all question types) */}
                        {q.type && (
                          <div className="mb-4">
                            <label className="block text-xs mb-1 font-inter text-gray-600">Answer Format</label>
                            <div className="flex gap-2">
                              <label className="flex items-center gap-1 text-sm font-inter">
                                <input
                                  type="radio"
                                  name={`format-${q.id}`}
                                  value="text"
                                  checked={q.answer_format === 'text'}
                                  onChange={() => handleAnswerFormatChange(q.id, 'text')}
                                  className="text-[#FF6551]"
                                />
                                Text
                              </label>
                              <label className="flex items-center gap-1 text-sm font-inter">
                                <input
                                  type="radio"
                                  name={`format-${q.id}`}
                                  value="number"
                                  checked={q.answer_format === 'number'}
                                  onChange={() => handleAnswerFormatChange(q.id, 'number')}
                                  className="text-[#FF6551]"
                                />
                                Number
                              </label>
                            </div>
                          </div>
                        )}


                      </>
                    )}

                    {/* Question Preview (for preset questions) */}
                    {q.usePreset && q.description && (
                      <div className="mb-4 p-3 bg-gray-50 rounded border">
                        <p className="text-sm text-gray-700 font-inter"><strong>Preview:</strong> {q.description}</p>
                        <p className="text-xs text-gray-500 font-inter">Type: {q.type}</p>
                      </div>
                    )}

                    {/* Options/Preview */}
                    {q.type === 'composite' && !q.usePreset ? (
                      <div className="space-y-4 mb-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600 font-inter">Sub-questions</label>
                          <button
                            onClick={() => handleWorkDaysPreset(q.id)}
                            className="px-3 py-1 text-xs bg-[#FF6551] text-white rounded hover:bg-[#ff7a6b] font-inter"
                          >
                            Use Work Days Preset
                          </button>
                        </div>
                        
                        {/* Sub-questions for composite */}
                        {q.sub_questions.length > 0 ? (
                          <div className="space-y-2">
                            {q.sub_questions.map((sub, subIdx) => (
                              <div key={subIdx} className="flex items-center gap-2">
                                <input
                              className="flex-1 border border-gray-200 rounded px-4 py-3 font-inter text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
                                  placeholder="Question"
                                  value={sub.question}
                                  onChange={e => handleSubQuestionChange(q.id, subIdx, 'question', e.target.value)}
                                />
                                <input
                                  type={q.answer_format === 'number' ? 'number' : 'text'}
                              className="w-32 border border-gray-200 rounded px-4 py-3 font-inter text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
                                  placeholder="Answer"
                                  value={sub.answer}
                                  onChange={e => handleSubQuestionChange(q.id, subIdx, 'answer', 
                                    q.answer_format === 'number' ? Number(e.target.value) : e.target.value)}
                                />
                                <button 
                                  onClick={() => handleSubQuestionRemove(q.id, subIdx)}
                                  className="p-2 rounded hover:bg-gray-100" 
                                  aria-label="Remove sub-question"
                                >
                                  <svg width="18" height="18" fill="none" stroke="#FF6551" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="5" y="5" width="14" height="14" rx="2"/>
                                    <path d="M9 9l6 6M15 9l-6 6"/>
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 text-sm py-4 border-2 border-dashed border-gray-200 rounded">
                            No sub-questions yet. Click "Add Sub-question" to create your custom composite question.
                          </div>
                        )}
                        
                        <button
                          onClick={() => handleSubQuestionAdd(q.id)}
                          className="px-4 py-2 rounded border border-gray-200 bg-white hover:bg-gray-100 font-inter font-medium text-sm"
                        >
                          Add Sub-question
                        </button>
                      </div>
                    ) : (q.type === 'single_select' || q.type === 'multi_select') && !q.usePreset ? (
                      <div className="space-y-2 mb-2">
                        <label className="text-sm text-gray-600 font-inter">Options</label>
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-gray-300 cursor-move">⋮⋮</span>
                            <input
                              className="flex-1 border border-gray-200 rounded px-4 py-3 font-inter text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-transparent"
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={e => handleOptionChange(q.id, i, e.target.value)}
                            />
                            <button className="p-2 rounded hover:bg-gray-100" aria-label="Delete" onClick={() => removeOption(q.id, i)}><svg width="18" height="18" fill="none" stroke="#FF6551" strokeWidth="2" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/></svg></button>
                          </div>
                        ))}
                        <button className="px-4 py-2 rounded border border-gray-200 bg-white hover:bg-gray-100 font-inter font-medium" onClick={() => addOption(q.id)}>Add Option</button>
                      </div>
                    ) : q.type === 'short_text' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <input
                          className="w-full border border-gray-200 rounded px-4 py-3 font-inter text-sm bg-gray-50"
                          placeholder="User will type a short answer here..."
                          disabled
                        />
                      </div>
                    ) : q.type === 'long_text' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <textarea
                          className="w-full border border-gray-200 rounded px-4 py-3 font-inter text-sm h-24 resize-none bg-gray-50"
                          placeholder="User will type a longer answer here..."
                          disabled
                        />
                      </div>
                    ) : q.type === 'time' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <input
                          type="time"
                          className="w-full border border-gray-200 rounded px-4 py-3 font-inter text-sm bg-gray-50"
                          disabled
                        />
                      </div>
                    ) : q.type === 'datetime' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <input
                          type="datetime-local"
                          className="w-full border border-gray-200 rounded px-4 py-3 font-inter text-sm bg-gray-50"
                          disabled
                        />
                      </div>
                    ) : q.type === 'file' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <div className="w-full border border-dashed border-gray-300 rounded px-3 py-6 font-inter text-sm text-center text-gray-500">
                          Click to upload file or drag and drop
                        </div>
                      </div>
                    ) : q.type === 'image' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <div className="w-full border border-dashed border-gray-300 rounded px-3 py-6 font-inter text-sm text-center text-gray-500">
                          Click to upload image or drag and drop
                        </div>
                      </div>
                    ) : q.type === 'location' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <div className="w-full border border-gray-200 rounded px-3 py-6 font-inter text-sm text-center text-gray-500 bg-gray-50">
                          📍 User will select location on map
                        </div>
                      </div>
                    ) : q.type === 'signature' && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <div className="w-full border border-gray-200 rounded px-3 py-16 font-inter text-sm text-center text-gray-500 bg-gray-50">
                          ✍️ User will draw signature here
                        </div>
                      </div>
                    ) : q.type && !q.usePreset ? (
                      <div className="mb-2">
                        <label className="text-sm text-gray-600 font-inter mb-1 block">Preview</label>
                        <input
                          className="w-full border border-gray-200 rounded px-4 py-3 font-inter text-sm bg-gray-50"
                          placeholder="User input preview..."
                          disabled
                        />
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 mt-4">
                      <label className="flex items-center gap-2 text-sm text-gray-600 font-inter">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-[#FF6551] focus:ring-[#FF6551] focus:ring-offset-0"
                          checked={q.isRequired}
                          onChange={e => handleQuestionChange(q.id, 'isRequired', e.target.checked)}
                        />
                        Required
                      </label>
                    </div>
                    </div>
                    
                    {/* Side Icons - Absolutely positioned */}
                    {/* Action Icons - Mobile responsive positioning */}
                    <div className="hidden sm:flex absolute -right-14 top-8 flex-col gap-2">
                      <button 
                        className="p-2 rounded-lg bg-gray-100 hover:bg-red-50 hover:border-red-200 border border-gray-200 shadow-sm transition-colors group" 
                        aria-label="Copy question"
                        onClick={() => copyQuestion(q.id)}
                        title="Copy question"
                      >
                        <svg width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24" className="group-hover:stroke-red-500 transition-colors">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </button>
                      <button 
                        className="p-2 rounded-lg bg-gray-100 hover:bg-red-50 hover:border-red-200 border border-gray-200 shadow-sm transition-colors group" 
                        aria-label="Delete question"
                        onClick={() => removeQuestion(q.id)}
                        title="Delete question"
                      >
                        <svg width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24" className="group-hover:stroke-red-500 transition-colors">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,0-1-1h-4a1,1,0,0,0-1,1v3M4,7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Mobile action buttons - inline */}
                    <div className="flex sm:hidden gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button 
                        className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-red-50 hover:border-red-200 border border-gray-200 transition-colors text-xs font-inter" 
                        onClick={() => copyQuestion(q.id)}
                      >
                        <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24" className="hover:stroke-red-500 transition-colors">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                      </button>
                      <button 
                        className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-red-50 hover:border-red-200 border border-gray-200 transition-colors text-xs font-inter text-red-600" 
                        onClick={() => removeQuestion(q.id)}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="hover:stroke-red-500 transition-colors">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,0-1-1h-4a1,1,0,0,0-1,1v3M4,7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {/* Two Add Buttons - Mobile responsive */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    className="flex-1 border-2 border-dashed border-[#FF6551] rounded-xl p-4 sm:p-6 text-[#FF6551] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[#FF6551] font-inter text-sm sm:text-base"
                    onClick={() => addQuestion(false)}
                    aria-label="Add new question"
                  >
                    + Add Question
                  </button>
                  <button
                    className="flex-1 border-2 border-dashed border-[#FF6551] rounded-xl p-4 sm:p-6 text-[#FF6551] hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[#FF6551] font-inter text-sm sm:text-base"
                    onClick={() => addQuestion(true)}
                    aria-label="Choose preset question"
                  >
                    + Choose Preset Question
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title="Form Filters"
        filters={[
          {
            key: 'module',
            value: moduleFilter,
            onChange: setModuleFilter,
            type: 'select',
            placeholder: 'Module',
            options: [
              { value: 'All', label: 'All Modules' },
              ...availableModules.map(module => ({ value: module, label: module }))
            ]
          },
          {
            key: 'person',
            value: personFilter,
            onChange: setPersonFilter,
            type: 'select',
            placeholder: 'Person',
            options: [
              { value: 'All', label: 'All Persons' },
              ...availableUsers.map(user => ({
                value: user.id,
                label: user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user.email
              }))
            ]
          },
          {
            key: 'dateFrom',
            value: dateFrom,
            onChange: setDateFrom,
            type: 'date',
            placeholder: 'Date From'
          },
          {
            key: 'dateTo',
            value: dateTo,
            onChange: setDateTo,
            type: 'date',
            placeholder: 'Date To'
          },
          {
            key: 'search',
            value: search,
            onChange: setSearch,
            type: 'search',
            placeholder: 'Search forms...'
          }
        ]}
        onClearAll={() => {
          setModuleFilter('All')
          setPersonFilter('All')
          setDateFrom('')
          setDateTo('')
          setSearch('')
        }}
      />
    </div>
  )
}