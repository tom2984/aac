// Client-side API wrapper that proxies Supabase operations through API routes
// This solves the client-side timeout issue by using the working server-side connection

import { supabase } from './supabase'

export class SupabaseAPIClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  // Generic API call helper with optional authentication
  private async apiCall(endpoint: string, options: RequestInit = {}, requireAuth: boolean = false) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }

    // Add authentication headers if required
    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    }

    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      headers,
      ...options
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Auth methods
  async getUser() {
    return this.apiCall('/auth/user')
  }

  async signUp(email: string, password: string, redirectTo?: string) {
    return this.apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, redirectTo })
    })
  }

  async signInWithEmail(email: string, password: string) {
    return this.apiCall('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async signOut() {
    return this.apiCall('/auth/signout', { method: 'POST' })
  }

  // Database methods
  async getProfiles() {
    return this.apiCall('/profiles')
  }

  async getProfile(id: string) {
    return this.apiCall(`/profiles/${id}`)
  }

  async createProfile(profileData: any) {
    return this.apiCall('/profiles/create', {
      method: 'POST',
      body: JSON.stringify(profileData)
    })
  }

  async updateProfile(id: string, profileData: any) {
    return this.apiCall(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  }

  async getForms() {
    return this.apiCall('/forms')
  }

  async createForm(formData: any) {
    return this.apiCall('/forms/create', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
  }

  async getFormResponses(formId: string) {
    return this.apiCall(`/forms/${formId}/responses`)
  }

  // Analytics methods
  async getAnalyticsDaysLost(userFilter?: string) {
    const params = new URLSearchParams()
    if (userFilter && userFilter !== 'All') {
      params.append('user_filter', userFilter)
    }
    
    const endpoint = `/analytics/days-lost${params.toString() ? `?${params.toString()}` : ''}`
    return this.apiCall(endpoint, {}, true) // Require authentication
  }

  // Preset questions methods
  async getPresetQuestions(adminId: string) {
    return this.apiCall(`/preset-questions?admin_id=${adminId}`)
  }

  async createPresetQuestion(questionData: any) {
    return this.apiCall('/preset-questions', {
      method: 'POST',
      body: JSON.stringify(questionData)
    })
  }

  // Generic query builder (simplified)
  from(table: string) {
    return {
      select: (columns: string = '*') => {
        return {
          eq: (column: string, value: any) => 
            this.apiCall(`/query/${table}?select=${columns}&${column}=eq.${value}`),
          
          limit: (count: number) => 
            this.apiCall(`/query/${table}?select=${columns}&limit=${count}`),
          
          execute: () => 
            this.apiCall(`/query/${table}?select=${columns}`)
        }
      },
      
      insert: (data: any) => ({
        execute: () => this.apiCall(`/query/${table}`, {
          method: 'POST',
          body: JSON.stringify(data)
        })
      }),
      
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          execute: () => this.apiCall(`/query/${table}?${column}=eq.${value}`, {
            method: 'PUT',
            body: JSON.stringify(data)
          })
        })
      }),
      
      remove: () => ({
        eq: (column: string, value: any) => ({
          execute: () => this.apiCall(`/query/${table}?${column}=eq.${value}`, {
            method: 'DELETE'
          })
        })
      })
    }
  }
}

// Export singleton instance
export const supabaseAPI = new SupabaseAPIClient() 