'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import AuthForm from '@/components/auth/AuthForm'
import { useRouter } from 'next/navigation'
import { useUser } from '@/app/UserProvider'

export default function HomePage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const userContext = useUser();

  // console.log('HomePage: userContext:', userContext);

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (userContext && userContext.user && userContext.profile && !userContext.loading) {
      // Always redirect to dashboard for regular login/signup
      // The mobile-app-download redirect should only happen from invite links
      router.push('/dashboard');
    }
  }, [userContext, router]);

  // Show loading state while checking auth
  if (!userContext || userContext.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
          <p className="mt-2 text-gray-600 font-inter">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-3 sm:p-6 lg:p-[72px]">
      <div className="flex flex-col lg:flex-row bg-white rounded-[16px] sm:rounded-[20px] lg:rounded-[30px] shadow-lg overflow-hidden w-full max-w-7xl min-h-[700px] sm:min-h-[750px] lg:min-h-[700px] lg:h-[700px]">
        {/* Image - Full width on mobile, half width on desktop */}
        <div className="relative w-full lg:flex-1 h-[200px] sm:h-[240px] md:h-[280px] lg:h-full lg:min-w-[50%] overflow-hidden rounded-t-[16px] sm:rounded-t-[20px] lg:rounded-l-[30px] lg:rounded-t-none lg:rounded-tr-none">
          <Image
            src="/login-image.jpg"
            alt="Construction background"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
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

        {/* Form area - Full width on mobile, half width on desktop */}
        <div className="flex-1 lg:min-w-[50%] flex items-center justify-center bg-[#FAFAFA] px-4 sm:px-8 lg:px-[80px] py-8 sm:py-12 lg:py-0 min-h-[500px] sm:min-h-[510px] lg:min-h-0">
          <AuthForm mode={mode} setMode={setMode} />
        </div>
      </div>
    </main>
  )
}
