'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'Check your email for the password reset link!'
      })
      setEmail('') // Clear the email field
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setLoading(false)
    }
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
              Reset Password
            </h2>
            <p className="text-sm sm:text-[16px] font-inter text-gray-600 text-center mb-4 sm:mb-6">
              Enter your email address and we'll send you a link to reset your password.
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
                <label htmlFor="email" className="text-xs sm:text-[12px] font-inter text-gray-700">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="h-12 sm:h-[52px] w-full rounded-[8px] border border-[#2729371F] px-4 sm:px-5 text-sm sm:text-[16px] font-inter placeholder:text-[#27293759] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="!text-white w-full h-12 sm:h-[52px] bg-[#FF6551] border-none font-semibold font-inter rounded-full hover:bg-[#FF4C38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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