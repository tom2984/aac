'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have access and session tokens from the URL
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (accessToken && refreshToken) {
      // Set the session using the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        if (error) {
          console.error('Error setting session:', error)
          setIsValidToken(false)
        } else {
          setIsValidToken(true)
        }
      })
    } else {
      // Check if user is already authenticated (from callback)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValidToken(true)
        } else {
          setIsValidToken(false)
        }
      })
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...'
      })

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
          <p className="mt-2 text-gray-600 font-inter">Verifying reset link...</p>
        </div>
      </main>
    )
  }

  if (isValidToken === false) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <div className="text-red-500 text-5xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 font-inter">Invalid Reset Link</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 font-inter">
            This password reset link is invalid or has expired. Please request a new password reset.
          </p>
          <Link 
            href="/forgot-password"
            className="inline-block bg-[#FF6551] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#FF4C38] transition-colors font-inter text-sm sm:text-base"
          >
            Request New Reset Link
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-3 sm:p-6 lg:p-[72px]">
      <div className="flex flex-col lg:flex-row bg-white rounded-[16px] sm:rounded-[20px] lg:rounded-[30px] shadow-lg overflow-hidden w-full max-w-7xl min-h-[600px] sm:min-h-[650px] lg:min-h-[700px] lg:h-[700px]">
        {/* Left: Image */}
        <div className="relative flex-1 h-56 sm:h-72 md:h-80 lg:h-full lg:min-w-[50%] overflow-hidden rounded-t-[16px] sm:rounded-t-[20px] lg:rounded-l-[30px] lg:rounded-t-none">
          <Image
            src="/login-image.jpg"
            alt="Construction background"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover rounded-t-[16px] sm:rounded-t-[20px] lg:rounded-l-[30px] lg:rounded-t-none"
            priority
          />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <Image 
              src="/logo.svg" 
              alt="AAC Logo" 
              width={70} 
              height={26}
              className="sm:w-[80px] sm:h-[30px] lg:w-[100px] lg:h-[37px]"
              priority
            />
          </div>
        </div>

        {/* Right: Form area */}
        <div className="flex-1 lg:min-w-[50%] h-full flex items-center justify-center bg-[#FAFAFA] px-4 sm:px-8 lg:px-[80px] py-6 sm:py-8 lg:py-0">
          <div className="w-full max-w-[450px] mx-auto flex flex-col items-center justify-start py-6 sm:py-8">
            <h2 className="text-2xl sm:text-[28px] lg:text-[32px] font-semibold font-inter text-center mb-2">
              Set New Password
            </h2>
            <p className="text-sm sm:text-[16px] font-inter text-gray-600 text-center mb-4 sm:mb-6">
              Enter your new password below.
            </p>

            {message && (
              <div
                className={`p-3 sm:p-4 mb-3 sm:mb-4 rounded-md text-sm w-full ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-5 sm:space-y-[29px]">
              <div className="flex flex-col gap-2 sm:gap-[10px]">
                <label htmlFor="password" className="text-xs sm:text-[12px] font-inter text-gray-700">New Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                  className="h-12 sm:h-[52px] w-full rounded-[8px] border border-[#2729371F] px-4 sm:px-5 text-sm sm:text-[16px] font-inter placeholder:text-[#27293759] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2 sm:gap-[10px]">
                <label htmlFor="confirmPassword" className="text-xs sm:text-[12px] font-inter text-gray-700">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                  className="h-12 sm:h-[52px] w-full rounded-[8px] border border-[#2729371F] px-4 sm:px-5 text-sm sm:text-[16px] font-inter placeholder:text-[#27293759] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="!text-white w-full h-12 sm:h-[52px] bg-[#FF6551] border-none font-semibold font-inter rounded-full hover:bg-[#FF4C38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            <div className="text-sm font-inter text-center mt-4 sm:mt-6">
              Remember your password?{' '}
              <Link href="/" className="text-[#FF6551] font-medium hover:underline transition-colors">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function LoadingFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
        <p className="mt-2 text-gray-600 font-inter">Loading...</p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
} 