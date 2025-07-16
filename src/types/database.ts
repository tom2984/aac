// Database types for the form management system
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type QuestionType = 'short_text' | 'long_text' | 'single_select' | 'multi_select' | 'composite'

export interface Database {
  public: {
    Tables: {
      forms: {
        Row: {
          id: string
          title: string
          description: string | null
          is_active: boolean
          is_public: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          settings: Json
          metadata: Json
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          is_active?: boolean
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          settings?: Json
          metadata?: Json
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          is_active?: boolean
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          settings?: Json
          metadata?: Json
        }
      }
      form_questions: {
        Row: {
          id: string
          form_id: string
          question_text: string
          question_type: QuestionType
          is_required: boolean
          order_index: number
          options: Json
          validation_rules: Json
          created_at: string
          updated_at: string
          metadata: Json
          preset_question_id: string | null
          answer_format: 'text' | 'number'
          sub_questions: Json
        }
        Insert: {
          id?: string
          form_id: string
          question_text: string
          question_type: QuestionType
          is_required?: boolean
          order_index: number
          options?: Json
          validation_rules?: Json
          created_at?: string
          updated_at?: string
          metadata?: Json
          preset_question_id?: string | null
          answer_format?: 'text' | 'number'
          sub_questions?: Json
        }
        Update: {
          id?: string
          form_id?: string
          question_text?: string
          question_type?: QuestionType
          is_required?: boolean
          order_index?: number
          options?: Json
          validation_rules?: Json
          created_at?: string
          updated_at?: string
          metadata?: Json
          preset_question_id?: string | null
          answer_format?: 'text' | 'number'
          sub_questions?: Json
        }
      }
      form_responses: {
        Row: {
          id: string
          form_id: string
          respondent_id: string | null
          status: string
          started_at: string
          submitted_at: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          form_id: string
          respondent_id?: string | null
          status?: string
          started_at?: string
          submitted_at?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          form_id?: string
          respondent_id?: string | null
          status?: string
          started_at?: string
          submitted_at?: string | null
          metadata?: Json
        }
      }
      form_response_answers: {
        Row: {
          id: string
          response_id: string
          question_id: string
          answer: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          response_id: string
          question_id: string
          answer: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          question_id?: string
          answer?: Json
          created_at?: string
          updated_at?: string
        }
      }
      form_assignments: {
        Row: {
          id: string
          form_id: string
          employee_id: string
          assigned_by: string
          status: 'pending' | 'in_progress' | 'completed' | 'overdue'
          assigned_at: string
          due_date: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          form_id: string
          employee_id: string
          assigned_by: string
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue'
          assigned_at?: string
          due_date?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          form_id?: string
          employee_id?: string
          assigned_by?: string
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue'
          assigned_at?: string
          due_date?: string | null
          completed_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          role: 'admin' | 'employee'
          status: 'invited' | 'active' | 'inactive'
          invited_by: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'employee'
          status?: 'invited' | 'active' | 'inactive'
          invited_by?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          role?: 'admin' | 'employee'
          status?: 'invited' | 'active' | 'inactive'
          invited_by?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      preset_questions: {
        Row: {
          id: string
          admin_id: string
          question_text: string
          question_type: QuestionType
          options: Json
          is_required: boolean
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          question_text: string
          question_type: QuestionType
          options?: Json
          is_required?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          question_text?: string
          question_type?: QuestionType
          options?: Json
          is_required?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_question_types: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
    }
    Enums: {
      question_type: QuestionType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 