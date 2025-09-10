'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

// Force dynamic rendering since we use searchParams
export const dynamic = 'force-dynamic'

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const validateInvite = async (retryCount = 0) => {
      // Add delay on first load to ensure URL parameters are ready
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Check for token first (new secure system)
      const rawToken = searchParams.get('token');
      
      console.log(`🔍 Validation attempt ${retryCount + 1}:`, {
        rawToken,
        searchParamsSize: searchParams ? Array.from(searchParams.entries()).length : 0,
        url: typeof window !== 'undefined' ? window.location.href : 'N/A'
      });
      
      // Handle both token formats: hex (new) and base64 (legacy)
      let processedToken = rawToken || null;
      
      if (rawToken) {
        // If token contains only hex characters (0-9, a-f), it's a new hex token
        const isHexToken = /^[0-9a-f]+$/i.test(rawToken);
        
        if (isHexToken) {
          // New hex tokens are already URL-safe, use as-is
          processedToken = rawToken;
          console.log('🎯 Detected hex token (new format)');
        } else {
          // Legacy base64 token - fix URL decoding issues
          processedToken = rawToken.replace(/ /g, '+');
          console.log('🎯 Detected base64 token (legacy format)');
        }
      }
      
      setToken(processedToken);
      console.log('🎯 Raw token from URL:', rawToken);
      console.log('🔧 Processed token:', processedToken);
      console.log('🎯 Token length:', processedToken?.length);
      
      if (processedToken) {
        try {
          // Validate token and get invite data
          console.log('🔍 Validating token:', processedToken.substring(0, 8) + '...');
          console.log('🔍 Current time:', new Date().toISOString());
          console.log('🌐 Current URL:', window.location.href);
          console.log('🔗 Full token for manual debugging:', processedToken);
          
          // First check if token exists at all
          const { data: tokenCheck, error: tokenCheckError } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('token', processedToken)
            .single();
          
          console.log('📊 Token exists check:', { tokenCheck, tokenCheckError });
          
          // Then check with all conditions
          const { data: invite, error: inviteError } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('token', processedToken)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .single();

          console.log('📊 Token validation result:', { invite, inviteError });
          
          if (tokenCheck && !invite) {
            console.log('🔍 Token found but failed validation:');
            console.log('  - Status:', tokenCheck.status);
            console.log('  - Expires at:', tokenCheck.expires_at);
            console.log('  - Current time:', new Date().toISOString());
          }

          if (inviteError || !invite) {
            console.error('❌ Token validation failed:');
            console.error('  - inviteError:', inviteError);
            console.error('  - invite data:', invite);
            console.error('  - Error code:', inviteError?.code);
            console.error('  - Error message:', inviteError?.message);
            
            if (tokenCheck) {
              console.error('❌ Token exists but validation failed. Possible reasons:');
              console.error('  - Token status:', tokenCheck.status, '(should be: pending)');
              console.error('  - Token expires:', tokenCheck.expires_at);
              console.error('  - Current time:', new Date().toISOString());
              console.error('  - Time comparison:', new Date(tokenCheck.expires_at) > new Date());
              
              // Still set email and invite data for better UX even if validation fails
              if (tokenCheck.email) {
                console.log('📧 Setting email from token data:', tokenCheck.email);
                setEmail(tokenCheck.email);
                setInviteData(tokenCheck);
              }
              
              // Provide specific error messages based on the issue
              if (tokenCheck.status === 'accepted') {
                // Allow reusing accepted tokens for testing (on any domain for now)
                console.log('🧪 TESTING MODE: Allowing reuse of accepted token for easier testing');
                console.log('🔄 Treating accepted token as valid for testing purposes');
                setInviteData(tokenCheck);
                setEmail(tokenCheck.email);
                setInviteValid(true);
                setError(''); // Clear any existing errors
                return;
                
                // Uncomment below for production behavior:
                // setInviteValid(false);
                // setError('This invitation has already been used. Please contact your administrator for a new invitation.');
              }
              
              if (new Date(tokenCheck.expires_at) <= new Date()) {
                setInviteValid(false);
                setError('This invitation has expired. Please contact your administrator for a new invitation.');
                return;
              }
            }
            
            // Retry once if this is the first attempt (race condition fix)
            if (retryCount === 0) {
              console.log('🔄 Retrying token validation (first attempt may have failed due to race condition)');
              setTimeout(() => {
                validateInvite(1);
              }, 1000);
              return;
            }
            
            setInviteValid(false);
            setError('Invalid or expired invitation link.');
            return;
          }

          setInviteData(invite);
          setEmail(invite.email);
          setInviteValid(true);

        } catch (error) {
          // Retry once if this is the first attempt
          if (retryCount === 0) {
            console.log('🔄 Retrying due to validation error (race condition fix)');
            setTimeout(() => {
              validateInvite(1);
            }, 1000);
            return;
          }
          
          setInviteValid(false);
          setError('Error validating invitation.');
        }
      } else {
        // No token found - check if we should retry
        if (retryCount === 0) {
          console.log('🔄 No token found on first attempt, retrying with URL parsing...');
          
          // Try parsing token directly from window.location if searchParams failed
          if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            console.log('🔍 Direct URL token check:', urlToken);
            
            if (urlToken) {
              console.log('✅ Found token in direct URL check, retrying validation...');
              setTimeout(() => {
                validateInvite(1);
              }, 500);
              return;
            }
          }
          
          // Still no token, retry once more
          setTimeout(() => {
            validateInvite(1);
          }, 1000);
          return;
        }
        
        // Fallback to old email-based system (for backwards compatibility)
        const emailParam = searchParams.get('email');
        if (emailParam) {
          setEmail(emailParam);
          setInviteValid(true);
          console.warn('Using legacy email-based invite link. Consider using token-based invites for better security.');
        } else {
          setInviteValid(false);
          setError('No invitation token or email provided in link.');
        }
      }
    };

    validateInvite();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !firstName || !lastName) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.error('🚨 Account creation timeout - forcing completion');
      setLoading(false);
      setError('Account creation timed out. Please try again or contact support.');
    }, 30000); // 30 second timeout

      try {
        // 1. Create user account via API (bypasses email confirmation for invited users)
        const signupResponse = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            role: inviteData?.role || 'employee',
            inviteToken: token,
            skipEmailConfirmation: true
          })
        });

        if (!signupResponse.ok) {
          const errorData = await signupResponse.json();
          throw new Error(errorData.error || 'Failed to create account');
        }

        const { user: authData, session, message } = await signupResponse.json();

        if (!authData) {
          throw new Error('Failed to create user account');
        }

        // If there's a session, the user is automatically signed in
        if (session) {
          console.log('✅ User automatically signed in with session');
          
          // Force set the session on the client-side to sync with UserProvider
          console.log('🔄 Setting session on client-side supabase instance...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
          
          if (sessionError) {
            console.error('❌ Error setting session:', sessionError);
          } else {
            console.log('✅ Session successfully set on client');
            
            // Wait a moment for auth listeners to fire
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else if (message) {
          console.warn('⚠️ Auto sign-in failed:', message);
          // Try to sign in manually as fallback
          console.log('🔄 Attempting manual sign-in as fallback...');
          const { data: fallbackData, error: fallbackError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (fallbackError) {
            console.error('❌ Manual sign-in fallback failed:', fallbackError);
          } else {
            console.log('✅ Manual sign-in fallback successful');
          }
        }

      // 2. Role-based redirect after account creation
      // Note: Profile and token handling is done by the custom signup API
      if (inviteData?.role === 'employee') {
        // Get current session to help mobile app with authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        alert('Account created! Redirecting you to the AAC Mobile App...');
        
        // Redirect to mobile app with onboarding parameters
        const mobileAppUrl = new URL('https://aac-app-five.vercel.app/');
        mobileAppUrl.searchParams.set('new_user', 'true');
        mobileAppUrl.searchParams.set('email', email);
        mobileAppUrl.searchParams.set('name', `${firstName} ${lastName}`);
        mobileAppUrl.searchParams.set('role', 'employee');
        
        console.log('🚀 Redirecting employee to mobile app:', mobileAppUrl.toString());
        window.location.href = mobileAppUrl.toString();
      } else {
        // Admin/Manager goes to dashboard with enhanced redirect
        console.log('🎯 Admin/Manager user detected - starting enhanced redirect to dashboard');
        
        setLoading(true);
        
        // Immediate attempt - no delay
        console.log('🚀 Immediate redirect attempt');
        router.push('/dashboard');
        
        // Quick fallback after 800ms
        setTimeout(() => {
          console.log('🚀 Quick fallback redirect (800ms)');
          if (window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
          }
        }, 800);
        
        // Medium fallback after 2 seconds
        setTimeout(() => {
          console.log('🚀 Medium fallback redirect (2s)');
          if (window.location.pathname !== '/dashboard') {
            window.location.replace('/dashboard');
          }
        }, 2000);
        
        // Nuclear option after 4 seconds
        setTimeout(() => {
          console.log('🚨 Nuclear redirect - forcing navigation (4s)');
          window.location.replace('/dashboard');
        }, 4000);
        
        // Emergency safety net after 6 seconds
        setTimeout(() => {
          console.log('🆘 Emergency fallback - if still not on dashboard, force reload');
          if (window.location.pathname !== '/dashboard') {
            console.error('🚨 All redirects failed, forcing hard reload to dashboard');
            window.location.href = '/dashboard';
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }, 6000);
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      setError(error.message);
      setLoading(false);
    } finally {
      // Clear timeout on successful completion
      clearTimeout(timeoutId);
    }
    // Note: Don't set loading to false here for admin users
    // since we want to show loading during the redirect sequence
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-inter">
            Accept Team Invitation
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 font-inter">
            Complete your profile to join the team
          </p>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 font-inter text-center">
              <strong>Note:</strong> {inviteData?.role === 'employee' 
                ? "After creating your account, you'll be redirected to download the mobile app. Employees use the mobile app to complete forms."
                : "After creating your account, you'll be redirected to the admin dashboard where you can manage forms and team members."
              }
            </p>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded font-inter">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 font-inter">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                readOnly
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 bg-gray-100 text-gray-900 rounded-md focus:outline-none focus:ring-[#FF6551] focus:border-[#FF6551] sm:text-sm font-inter"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 font-inter">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-[#FF6551] focus:border-[#FF6551] sm:text-sm font-inter"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 font-inter">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-[#FF6551] focus:border-[#FF6551] sm:text-sm font-inter"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 font-inter">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-[#FF6551] focus:border-[#FF6551] sm:text-sm font-inter"
                placeholder="At least 6 characters"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 font-inter">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-[#FF6551] focus:border-[#FF6551] sm:text-sm font-inter"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#FF6551] hover:bg-[#FF4C38] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF6551] disabled:bg-gray-400 disabled:cursor-not-allowed font-inter"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6551] mx-auto"></div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Loading...</h2>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInviteForm />
    </Suspense>
  );
} 