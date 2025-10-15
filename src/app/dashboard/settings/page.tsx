'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@/app/UserProvider'
import { supabase } from '@/lib/supabase'
import PersonalSettingsCard from './PersonalSettingsCard'
import TeamMembersTable from './TeamMembersTable'
import XeroConnectionCard from './XeroConnectionCard'
import { AdminOnly } from '@/components/RoleGuard'

// Helper function to get all team member IDs for team-based access
async function getTeamMemberIds(userId: string, invitedBy: string | null): Promise<string[]> {
  const teamMemberIds = new Set<string>()
  
  // Always include the current user
  teamMemberIds.add(userId)
  
  // If this user was invited by someone, include the inviter (team root)
  if (invitedBy) {
    teamMemberIds.add(invitedBy)
    
    // Also include all other people invited by the same admin
    const { data: siblings } = await supabase
      .from('profiles')
      .select('id')
      .eq('invited_by', invitedBy)
      .neq('id', userId) // Don't include self again
    
    if (siblings) {
      siblings.forEach((sibling: any) => teamMemberIds.add(sibling.id))
    }
  }
  
  // Include all people this user has invited (their team members)
  const { data: invitees } = await supabase
    .from('profiles')
    .select('id')
    .eq('invited_by', userId)
  
  if (invitees) {
    invitees.forEach((invitee: any) => teamMemberIds.add(invitee.id))
  }
  
  return Array.from(teamMemberIds)
}

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

  // Handle removing team members
  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Deactivate the user profile (safer than deleting)
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', memberId);

      if (error) throw error;

      // Refresh the team members list
      const fetchTeamMembers = async () => {
        if (!user || !profile) return;
        
        try {
          let teamMembers: TeamMember[] = [];
          
          if (profile.role === 'admin' || profile.role === 'manager') {
            const teamMemberIds = await getTeamMemberIds(user.id, profile.invited_by);
            
            const { data: allTeamMembers, error } = await supabase
              .from('profiles')
              .select('*')
              .in('invited_by', teamMemberIds)
              .neq('id', user.id)
              .eq('status', 'active') // Only show active members
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Error fetching team members:', error);
              return;
            }

            teamMembers = allTeamMembers || [];
          }

          const employeeList = teamMembers.filter(member => member.role === 'employee');
          const adminManagerList = teamMembers.filter(member => ['admin', 'manager'].includes(member.role));
          
          setEmployees(employeeList);
          setAdminsAndManagers(adminManagerList);
          
        } catch (error) {
          console.error('Error fetching team members:', error);
        }
      };

      await fetchTeamMembers();
      alert(`${memberEmail} has been successfully removed from the team.`);
      
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch team members (full team for admins/managers)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user || !profile) return;
      
      try {
        let teamMembers: TeamMember[] = [];
        
        if (profile.role === 'admin' || profile.role === 'manager') {
          // Get team member IDs using same logic as API
          const teamMemberIds = await getTeamMemberIds(user.id, profile.invited_by);
          
          console.log(`🔍 Settings: Getting team members for ${profile.role} ${user.email}`)
          console.log(`🔍 Settings: Team member IDs:`, teamMemberIds)
          
          // Get all team members (only active ones) - INCLUDE current user
          const { data: allTeamMembers, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', teamMemberIds) // ✅ Get users whose ID is in the team
            // REMOVED: .neq('id', user.id) - Now include current user
            .eq('status', 'active') // Only show active members
            .order('created_at', { ascending: false });
          
          console.log(`🔍 Settings: Found ${allTeamMembers?.length || 0} team members:`, 
            allTeamMembers?.map((u: any) => ({ email: u.email, role: u.role })))

          if (error) {
            console.error('Error fetching team members:', error);
            return;
          }

          teamMembers = allTeamMembers || [];
        } else {
          // For employees, no team management access
          teamMembers = [];
        }

        // Separate employees from admins/managers
        const employeeList = teamMembers.filter(member => member.role === 'employee');
        const adminManagerList = teamMembers.filter(member => ['admin', 'manager'].includes(member.role));
        
        setEmployees(employeeList);
        setAdminsAndManagers(adminManagerList);
        
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    };

    fetchTeamMembers();
  }, [user, profile]);

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
      <PersonalSettingsCard 
        initialFirstName={profile?.first_name || ''}
        initialLastName={profile?.last_name || ''}
        initialAvatarUrl={profile?.avatar_url || '/avatar-placeholder.svg'}
        onSave={async (data) => {
          // Handle profile update logic here if needed
          console.log('Profile update:', data);
          if (refreshProfile) {
            await refreshProfile();
          }
        }}
      />

      {/* Xero Integration - Admin Only */}
      <AdminOnly>
        <XeroConnectionCard />
      </AdminOnly>

      {/* Team Management - Only admins can invite */}
      {profile?.role === 'admin' && (
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
      )}

      {/* Team Members List - Show for admins and managers */}
      {(profile?.role === 'admin' || profile?.role === 'manager') && (
      <div className="space-y-6">
        {/* Employees Section */}
        {employees.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Employees ({employees.length})</h3>
              <p className="text-sm text-gray-600">Team members with employee access</p>
            </div>
            <div className="p-6">
              <TeamMembersTable 
                teamMembers={employees.map(emp => ({
                  id: emp.id,
                  name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'N/A',
                  email: emp.email,
                  status: emp.status === 'active' ? 'Active' : 'Pending',
                  role: emp.role
                }))}
                showRole={false}
                currentUserId={user?.id}
                currentUserRole={profile?.role}
                onRemoveMember={handleRemoveMember}
              />
            </div>
          </div>
        )}

        {/* Admins & Managers Section */}
        {adminsAndManagers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Admins & Managers ({adminsAndManagers.length})</h3>
              <p className="text-sm text-gray-600">Team members with administrative access</p>
            </div>
            <div className="p-6">
              <TeamMembersTable 
                teamMembers={adminsAndManagers.map(admin => ({
                  id: admin.id,
                  name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'N/A',
                  email: admin.email,
                  status: admin.status === 'active' ? 'Active' : 'Pending',
                  role: admin.role
                }))}
                showRole={true}
                currentUserId={user?.id}
                currentUserRole={profile?.role}
                onRemoveMember={handleRemoveMember}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {employees.length === 0 && adminsAndManagers.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No team members found. Start by inviting some team members above!</p>
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;