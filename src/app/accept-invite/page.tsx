"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AcceptInvitePage() {
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

  useEffect(() => {
    const validateInvite = async () => {
      // Check for token first (new secure system)
      const token = searchParams.get('token');
      
      if (token) {
        try {
          // Validate token and get invite data
          const { data: invite, error: inviteError } = await supabase
            .from('invite_tokens')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .single();

          if (inviteError || !invite) {
            setInviteValid(false);
            setError('Invalid or expired invitation link.');
            return;
          }

          setInviteData(invite);
          setEmail(invite.email);
          setInviteValid(true);

        } catch (error) {
          setInviteValid(false);
          setError('Error validating invitation.');
        }
      } else {
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

    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // 2. Create a profile for the new user with proper invite relationship
      const profileData = {
        id: authData.user.id,
        email: authData.user.email,
        first_name: firstName,
        last_name: lastName,
        role: inviteData?.role || 'employee',
        status: 'active',
        ...(inviteData?.invited_by && { invited_by: inviteData.invited_by })
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        throw new Error('Failed to create profile: ' + profileError.message);
      }

      // 3. Mark the invite token as accepted (if using token-based system)
      if (inviteData) {
        const { error: tokenUpdateError } = await supabase
          .from('invite_tokens')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', inviteData.id);

        if (tokenUpdateError) {
          console.error('Warning: Failed to update invite token status:', tokenUpdateError);
          // Don't fail the whole process for this
        }
      }

      // 4. Show success and redirect to mobile app
      alert('Account created successfully! Please download the mobile app to access your forms.');
      router.push('/mobile-app-download');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // if (inviteValid === null) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="max-w-md w-full space-y-8">
  //         <div className="text-center">
  //           <h2 className="text-2xl font-bold text-gray-900">Loading...</h2>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // if (inviteValid === false) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="max-w-md w-full space-y-8">
  //         <div className="text-center">
  //           <h2 className="text-2xl font-bold text-gray-900">Invalid Invitation</h2>
  //           <p className="mt-2 text-gray-600">
  //             This invitation link is invalid or has already been used.
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

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
              <strong>Note:</strong> After creating your account, you'll be redirected to download the mobile app. Employees use the mobile app to complete forms.
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