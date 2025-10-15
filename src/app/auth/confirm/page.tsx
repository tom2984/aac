'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'

function ConfirmSignupContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmSignup = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setStatus('error')
        setMessage('Invalid confirmation link')
        return
      }

      try {
        // Verify the confirmation token
        const response = await fetch('/api/auth/verify-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token })
        })

        const result = await response.json()

        if (!response.ok) {
          if (result.error === 'Token expired') {
            setStatus('expired')
            setMessage('This confirmation link has expired. Please request a new one.')
          } else {
            setStatus('error')
            setMessage(result.error || 'Failed to confirm account')
          }
          return
        }

        // Token is valid, user is confirmed
        setStatus('success')
        setMessage('Your account has been confirmed successfully!')
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/?confirmed=true')
        }, 3000)

      } catch (error) {
        console.error('❌ Confirmation error:', error)
        setStatus('error')
        setMessage('An error occurred while confirming your account')
      }
    }

    confirmSignup()
  }, [searchParams, router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6551] mx-auto mb-4"></div>
            <h1 className="text-2xl font-semibold font-inter mb-2">Confirming Account</h1>
            <p className="text-gray-600">Please wait while we confirm your account...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold font-inter text-green-800 mb-2">Account Confirmed!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting you to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold font-inter text-red-800 mb-2">Confirmation Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full h-12 bg-[#FF6551] text-white font-semibold font-inter rounded-full hover:bg-[#FF4C38] transition-colors"
            >
              Back to Login
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold font-inter text-yellow-800 mb-2">Link Expired</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // TODO: Implement resend confirmation email
                  alert('Resend functionality will be implemented')
                }}
                className="w-full h-12 bg-[#FF6551] text-white font-semibold font-inter rounded-full hover:bg-[#FF4C38] transition-colors"
              >
                Resend Confirmation Email
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full h-12 bg-gray-100 text-gray-700 font-semibold font-inter rounded-full hover:bg-gray-200 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function ConfirmSignup() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6551] mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold font-inter mb-2">Loading</h1>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </main>
    }>
      <ConfirmSignupContent />
    </Suspense>
  )
}
