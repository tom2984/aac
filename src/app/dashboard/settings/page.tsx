"use client";

import React, { useState, useRef, KeyboardEvent, ChangeEvent, MouseEvent, useEffect } from 'react';
import PersonalSettingsCard from './PersonalSettingsCard';
import TeamMembersTable from './TeamMembersTable';
import { useUser } from '@/app/UserProvider';
import { supabase } from '@/lib/supabase';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
];

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const defaultUser = {
  firstName: 'Daimonko',
  lastName: 'Soul',
  avatarUrl: '/avatar-placeholder.png',
};

type TeamMember = {
  name: string;
  email: string;
  status: string;
  role: string;
};

const SettingsPage = () => {
  const userContext = useUser();
  const user = userContext?.user;
  const profile = userContext?.profile;
  const refreshProfile = userContext?.refreshProfile;
  // Team members state
  const [employees, setEmployees] = useState<TeamMember[]>([]);
  const [adminsAndManagers, setAdminsAndManagers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  // InviteMembers logic
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch team members (all users invited by this admin)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) return;

      // Fetch employees
      const { data: employeeData, error: employeeError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, status, invited_by, role')
        .eq('invited_by', user.id)
        .eq('role', 'employee');

      if (employeeError) {
        console.error('Error fetching employees:', employeeError);
        return;
      }

      // Fetch admins and managers
      const { data: adminManagerData, error: adminManagerError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, status, invited_by, role')
        .eq('invited_by', user.id)
        .in('role', ['admin', 'manager']);

      if (adminManagerError) {
        console.error('Error fetching admins/managers:', adminManagerError);
        return;
      }

      const formatMember = (member: any) => ({
        name: member.first_name && member.last_name 
          ? `${member.first_name} ${member.last_name}` 
          : 'Pending',
        email: member.email || 'Email not available',
        status: member.status === 'invited' ? 'Pending' : 
               member.status === 'active' ? 'Active' : 
               'Inactive',
        role: member.role
      });

      setEmployees(employeeData.map(formatMember));
      setAdminsAndManagers(adminManagerData.map(formatMember));
    };

    fetchTeamMembers();
  }, [user]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value);
  const handleAddEmail = (email: string) => {
    const trimmed = email.trim();
    if (trimmed && isValidEmail(trimmed) && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
    }
    setInputValue('');
  };
  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", "Tab", ","].includes(e.key)) {
      e.preventDefault();
      if (inputValue) handleAddEmail(inputValue);
    }
  };
  const handleInputBlur = () => { if (inputValue) handleAddEmail(inputValue); };
  const handleRemoveEmail = (removeEmail: string) => setEmails(emails.filter(email => email !== removeEmail));
  const handleRoleChange = (e: ChangeEvent<HTMLSelectElement>) => setRole(e.target.value);
  const handleDiscard = () => {
    setEmails([]);
    setInputValue('');
    setRole(ROLE_OPTIONS[0].value);
  };


  const handleInviteSave = async () => {
    if (!user || emails.length === 0) return;
    
    setLoading(true);
    
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No valid session found')
      }

      // Use the new secure invitation API
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          emails,
          role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitations');
      }

      // Clear form
      setEmails([]);
      setInputValue('');
      setRole(ROLE_OPTIONS[0].value);

      // Show results
      const { summary, results } = result;
      
      if (summary.successful > 0) {
        // Generate invitation links for successful invites
        const successfulInvites = results.filter((r: any) => r.status === 'success');
        const inviteLinks = successfulInvites.map((invite: any) => 
          `📧 ${invite.email}\n🔗 ${invite.inviteLink}\n`
        ).join('\n');

        let message = `🎉 Successfully created ${summary.successful} invitation(s)!`;
        
        if (summary.skipped > 0) {
          message += `\n⚠️ ${summary.skipped} invitation(s) were skipped (already pending).`;
        }
        
        if (summary.errors > 0) {
          message += `\n❌ ${summary.errors} invitation(s) failed.`;
        }

        message += `\n\n📤 Send these secure invitation links to your team members:\n\n${inviteLinks}`;
        message += `\n💡 Copy each link and send it to the respective email address.`;
        message += `\n⏰ Links expire in 7 days.`;
        
        alert(message);
      } else {
        let errorMessage = 'No invitations were sent successfully.';
        
        const errorResults = results.filter((r: any) => r.status === 'error');
        if (errorResults.length > 0) {
          errorMessage += '\n\nErrors:\n' + errorResults.map((r: any) => `${r.email}: ${r.message}`).join('\n');
        }
        
        alert(errorMessage);
      }

      // Refresh team members list to show any new pending invitations
      // The existing useEffect will handle this automatically
      
    } catch (error: any) {
      console.error('Error sending invites:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save handler
  const handleProfileSave = async ({
    firstName,
    lastName,
    avatar,
  }: {
    firstName: string;
    lastName: string;
    avatar?: File | null;
  }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!firstName.trim() || !lastName.trim()) {
      throw new Error('First name and last name are required');
    }

    let avatar_url = profile?.avatar_url || '';

    try {
      // If avatar is provided, upload to storage and get public URL
      if (avatar) {
        const fileExt = avatar.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatar, { upsert: true });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw new Error('Failed to upload avatar: ' + uploadError.message);
        }

        // Get public URL
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatar_url = data.publicUrl;
      }

      // Get the current user to ensure we have the latest session
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error('Authentication session expired. Please refresh the page and try again.');
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userData.user.id,
            first_name: firstName,
            last_name: lastName,
            avatar_url,
            email: userData.user.email, // Ensure email is set
          },
          { onConflict: 'id' }
        );

      if (updateError) {
        console.error('Profile update error:', updateError);
        
        // Handle specific RLS policy errors
        if (updateError.message.includes('violates row-level security policy') || 
            updateError.message.includes('permission denied') ||
            updateError.code === '42501') {
          throw new Error('Permission denied. Please contact support to fix your account permissions.');
        }
        
        throw new Error('Failed to update profile: ' + updateError.message);
      }

      // Refresh the profile data in the UserProvider
      if (refreshProfile) {
        await refreshProfile();
      }

    } catch (error: any) {
      console.error('Profile save error:', error);
      throw error; // Re-throw so the component can handle it
    }
  };

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-full sm:max-w-4xl mx-auto py-6 sm:py-12 w-full font-inter px-4 sm:px-0">
      <PersonalSettingsCard
        initialFirstName={profile.first_name}
        initialLastName={profile.last_name}
        initialAvatarUrl={profile.avatar_url}
        onSave={handleProfileSave}
      />
      
      {/* Modern Invite System */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 w-full font-inter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 sm:gap-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 font-inter">Team Members</h2>
            <p className="text-gray-600 mt-1 font-inter">Invite and manage your team members</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 sm:flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="whitespace-nowrap">
              {employees.length + adminsAndManagers.length} team member{(employees.length + adminsAndManagers.length) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Invite Form */}
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 font-inter">Invite New Members</h3>
          
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-2 font-inter">Email Addresses</label>
              <div className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-[#FF6551] focus-within:border-[#FF6551] min-h-[48px]">
                <div className="flex flex-wrap gap-2 items-center">
                  {emails.map(email => (
                    <span key={email} className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#FF6551] text-white text-xs sm:text-sm rounded-full">
                      <span className="max-w-[120px] sm:max-w-none truncate">{email}</span>
                      <button
                        type="button"
                        className="text-white hover:text-gray-200 focus:outline-none flex-shrink-0 p-1 -m-1"
                        onClick={() => handleRemoveEmail(email)}
                        aria-label={`Remove ${email}`}
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    id="email-input"
                    ref={inputRef}
                    type="email"
                    className="flex-1 bg-transparent outline-none min-w-[120px] sm:min-w-[200px] text-sm font-inter"
                    placeholder={emails.length === 0 ? "Enter email addresses..." : "Add another email"}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-inter">Press Enter, Tab, or comma to add multiple emails</p>
            </div>

            <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
              <div>
                <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2 font-inter">Role</label>
                <select
                  id="role-select"
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 sm:py-2 bg-white focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] font-inter text-base sm:text-sm"
                  value={role}
                  onChange={handleRoleChange}
                >
                  {ROLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:justify-end">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    type="button"
                    className="w-full sm:flex-1 px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 font-inter text-base sm:text-sm font-medium"
                    onClick={handleDiscard}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-[#FF6551] text-white rounded-lg hover:bg-[#ff7a6b] focus:outline-none focus:ring-2 focus:ring-[#FF6551] font-inter disabled:bg-gray-400 disabled:cursor-not-allowed text-base sm:text-sm font-medium"
                    onClick={handleInviteSave}
                    disabled={loading || emails.length === 0}
                  >
                    {loading ? 'Sending...' : `Send Invite${emails.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Admins & Managers Section */}
        {adminsAndManagers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-inter">
              Admins & Managers ({adminsAndManagers.length})
            </h3>
            <TeamMembersTable teamMembers={adminsAndManagers} showRole={true} />
          </div>
        )}

        {/* Employees Section */}
        {employees.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-inter">
              Employees ({employees.length})
            </h3>
            <TeamMembersTable teamMembers={employees} showRole={false} />
          </div>
        )}

        {/* No team members message */}
        {employees.length === 0 && adminsAndManagers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="font-inter">No team members yet. Start by inviting some!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage; 