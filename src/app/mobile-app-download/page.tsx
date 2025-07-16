'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

export default function MobileAppDownloadPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#FF6551]">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-inter">
            Welcome to the Team!
          </h2>
          
          <p className="mt-2 text-center text-sm text-gray-600 font-inter">
            Your account has been created successfully
            {email && (
              <span className="block font-medium text-gray-900 mt-1">{email}</span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 font-inter mb-2">
              Download the Mobile App
            </h3>
            <p className="text-sm text-gray-600 font-inter">
              To access your assigned forms and complete your work, you'll need to download our mobile app.
            </p>
          </div>

          <div className="space-y-4">
            {/* iOS App Store Button */}
            <a
              href="#" // Replace with actual App Store link when available
              className="w-full bg-black text-white rounded-lg p-4 flex items-center justify-center space-x-3 hover:bg-gray-800 transition-colors font-inter"
              onClick={(e) => {
                e.preventDefault();
                alert('iOS app coming soon! Please check back later.');
              }}
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">Download on the</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </a>

            {/* Google Play Store Button */}
            <a
              href="#" // Replace with actual Play Store link when available
              className="w-full bg-black text-white rounded-lg p-4 flex items-center justify-center space-x-3 hover:bg-gray-800 transition-colors font-inter"
              onClick={(e) => {
                e.preventDefault();
                alert('Android app coming soon! Please check back later.');
              }}
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <div className="text-xs">Get it on</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 font-inter mb-2">
                What's Next?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 font-inter">
                <li>• Download the mobile app</li>
                <li>• Log in with your email and password</li>
                <li>• Complete forms assigned by your admin</li>
                <li>• Track your progress and submissions</li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-gray-500 font-inter">
              Having trouble? Contact your administrator for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 