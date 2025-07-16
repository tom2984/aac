'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type AuthFormProps = {
  mode: 'login' | 'signup'
  setMode: (mode: 'login' | 'signup') => void
}

const AuthForm = ({ mode, setMode }: AuthFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      setLoading(false)
      return
    }

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        
        if (data.user && data.session) {
          // Create admin profile for new signups
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              role: 'admin',
              status: 'active',
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
            // Don't throw error, just log it - user can still proceed
          }

          setTimeout(() => {
            router.push('/dashboard');
          }, 100);
        } else {
          setMessage({ type: 'success', text: 'Check your email for the confirmation link!' })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Let the auth state change listener handle the redirect
        setMessage({ type: 'success', text: 'Successfully signed in!' })
        // Small delay to allow auth state to update
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`w-full max-w-[500px] mx-auto flex flex-col items-center justify-start px-2 sm:px-4 lg:px-6 ${mode === 'signup' ? 'py-4 sm:py-6' : 'py-4 sm:py-6'}`}>
      <h2 className="text-2xl sm:text-[28px] lg:text-[32px] font-semibold font-inter text-center mb-6 sm:mb-8">
        {mode === 'signup' ? 'Sign Up' : 'Log In'}
      </h2>

      {message && (
        <div
          className={`p-4 sm:p-5 mb-4 sm:mb-6 rounded-md text-sm w-full ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={`w-full ${mode === 'signup' ? 'space-y-5 sm:space-y-6' : 'space-y-6 sm:space-y-[29px]'}`}>
        <div className="flex flex-col gap-3 sm:gap-[10px]">
          <label htmlFor="email" className="text-sm sm:text-[12px] font-inter text-gray-700">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            className="h-14 sm:h-[52px] w-full rounded-[8px] border border-[#2729371F] px-4 sm:px-5 text-base sm:text-[16px] font-inter placeholder:text-[#27293759] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-3 sm:gap-[10px]">
          <label htmlFor="password" className="text-sm sm:text-[12px] font-inter text-gray-700">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="h-14 sm:h-[52px] w-full rounded-[8px] border border-[#2729371F] px-4 sm:px-5 text-base sm:text-[16px] font-inter placeholder:text-[#27293759] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] transition-colors"
          />
        </div>

        {mode === 'signup' && (
          <div className="flex flex-col gap-3 sm:gap-[10px]">
            <label htmlFor="confirm-password" className="text-sm sm:text-[12px] font-inter text-gray-700">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              className="h-14 sm:h-[52px] w-full rounded-[8px] border border-[#2729371F] px-4 sm:px-5 text-base sm:text-[16px] font-inter placeholder:text-[#27293759] focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] transition-colors"
            />
          </div>
        )}

        {mode === 'login' && (
          <div className="text-left pt-2">
            <Link href="/forgot-password" className="text-sm font-inter text-[#FF6551] hover:underline transition-colors">
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`!text-white w-full h-14 sm:h-[52px] bg-[#FF6551] border-none font-semibold font-inter rounded-full hover:bg-[#FF4C38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base sm:text-base ${mode === 'signup' ? 'mt-6 sm:mt-8' : 'mt-4'}`}
        >
          {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      <div className={`text-sm font-inter text-center gap-2 ${mode === 'signup' ? 'mt-5 sm:mt-6' : 'mt-4 sm:mt-5'}`}>
        {mode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className="text-[#FF6551] font-medium hover:underline bg-transparent border-none p-0 m-0 transition-colors"
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="text-[#FF6551] font-medium hover:underline bg-transparent border-none p-0 m-0 transition-colors"
              onClick={() => setMode('login')}
            >
              Log in
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthForm
