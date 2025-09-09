'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/app/UserProvider'
import { supabase } from '@/lib/supabase'
import PersonalSettingsCard from './PersonalSettingsCard'
import TeamMembersTable from './TeamMembersTable'

type TeamMember = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  invited_by: string | null;
  created_at: string;
};

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' }
];

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
  const [testMode, setTestMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch team members (all users invited by this admin)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) return;
      
      try {
        // Get all profiles where invited_by matches the current user
        const { data: teamMembers, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('invited_by', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching team members:', error);
          return;
        }

        if (teamMembers) {
          // Separate employees from admins/managers
          const employeeList = teamMembers.filter(member => member.role === 'employee');
          const adminManagerList = teamMembers.filter(member => ['admin', 'manager'].includes(member.role));
          
          setEmployees(employeeList);
          setAdminsAndManagers(adminManagerList);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    fetchTeamMembers();
  }, [user]);

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      const trimmedValue = inputValue.trim();
      if (trimmedValue && !emails.includes(trimmedValue)) {
        setEmails([...emails, trimmedValue]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      const newEmails = [...emails];
      newEmails.pop();
      setEmails(newEmails);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleDiscard = () => {
    setEmails([]);
    setInputValue('');
    setRole(ROLE_OPTIONS[0].value);
    setTestMode(false);
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
          role,
          ...(testMode && { forceResend: true })
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
      setTestMode(false);

      // Show results
      const { summary, results } = result;
      
      if (summary.successful > 0) {
        const message = testMode 
          ? `🧪 Test invitations sent to ${summary.successful} user(s)! Check your email.`
          : `✅ Successfully sent ${summary.successful} invitation(s)!`;
        alert(message);
      }
      
      if (summary.skipped > 0) {
        alert(`⚠️ ${summary.skipped} invitation(s) were skipped (already pending)`);
      }
      
      if (summary.emailFailed > 0) {
        alert(`❌ ${summary.emailFailed} invitation(s) failed to send`);
      }

      // Refresh team members list
      const fetchTeamMembers = async () => {
        const { data: teamMembers, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('invited_by', user.id)
          .order('created_at', { ascending: false });

        if (!error && teamMembers) {
          const employeeList = teamMembers.filter(member => member.role === 'employee');
          const adminManagerList = teamMembers.filter(member => ['admin', 'manager'].includes(member.role));
          
          setEmployees(employeeList);
          setAdminsAndManagers(adminManagerList);
        }
      };
      
      await fetchTeamMembers();

    } catch (error) {
      console.error('Error sending invitations:', error);
      alert('Error sending invitations: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return (
      <div className="p-6">
        <p>Access denied. This page is only available to administrators and managers.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and team members</p>
      </div>

      {/* Personal Settings */}
      <PersonalSettingsCard profile={profile} refreshProfile={refreshProfile} />

      {/* Team Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Team Management</h2>
          <p className="text-sm text-gray-600">Invite new team members and manage existing ones</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Team Members
              </label>
              
              {/* Test Mode Toggle */}
              {testMode && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600 font-medium">🧪 Test Mode Active</span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Will resend emails even if user already has pending invite - perfect for testing!
                  </p>
                </div>
              )}
              
              <div className="flex items-center space-x-2 mb-3">
                <input 
                  type="checkbox" 
                  id="testMode"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="testMode" className="text-sm text-gray-600">
                  🧪 Test Mode (for development/testing)
                </label>
              </div>

              <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md min-h-[42px] bg-white">
                {emails.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  type="email"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleEmailInputKeyDown}
                  placeholder={emails.length === 0 ? "Enter email addresses..." : "Add another email..."}
                  className="flex-1 min-w-[200px] border-none outline-none bg-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Press Enter, comma, or semicolon to add multiple emails
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleInviteSave}
                disabled={emails.length === 0 || loading}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  testMode
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {loading ? 'Sending...' : testMode ? '🧪 Send Test Invitations' : '📧 Send Invitations'}
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <TeamMembersTable 
        employees={employees} 
        adminsAndManagers={adminsAndManagers}
      />
    </div>
  );
};

export default SettingsPage;