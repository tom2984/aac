import React from 'react';

type TeamMember = {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
};

type TeamMembersTableProps = {
  teamMembers: TeamMember[];
  showRole?: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  onRemoveMember?: (memberId: string, memberEmail: string) => void;
};

const TeamMembersTable: React.FC<TeamMembersTableProps> = ({ 
  teamMembers, 
  showRole = false, 
  currentUserId,
  currentUserRole,
  onRemoveMember 
}) => {
  if (teamMembers.length === 0) return null;

  const copyInviteLink = async (email: string) => {
    const inviteLink = `${window.location.origin}/accept-invite?email=${encodeURIComponent(email)}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('Invitation link copied to clipboard!');
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      prompt('Copy this invitation link:', inviteLink);
    }
  };

  return (
    <div className="w-full font-inter">
      
      {/* Mobile Card Layout */}
      <div className="block sm:hidden space-y-3">
        {teamMembers.map((member, idx) => (
          <div key={member.email + idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex flex-col space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Email</div>
                <div className="text-sm text-gray-900 break-all flex items-center gap-2">
                  {member.email}
                  {member.id === currentUserId && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      You
                    </span>
                  )}
                </div>
              </div>
              
              {showRole && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Role</div>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                    {member.role}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Status</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    member.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : member.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  {member.status === 'Pending' && (
                    <button
                      onClick={() => copyInviteLink(member.email)}
                      className="px-3 py-1 text-[#FF6551] hover:text-[#ff7a6b] text-xs font-medium font-inter focus:outline-none focus:ring-2 focus:ring-[#FF6551] focus:ring-offset-1 rounded-md border border-[#FF6551] hover:border-[#ff7a6b]"
                    >
                      Copy Link
                    </button>
                  )}
                  {member.id !== currentUserId && currentUserRole === 'admin' && onRemoveMember && (
                    <button
                      onClick={() => onRemoveMember(member.id, member.email)}
                      className="px-3 py-1 text-red-600 hover:text-red-700 text-xs font-medium font-inter focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded-md border border-red-600 hover:border-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 font-medium text-gray-700 font-inter text-sm">Email</th>
              {showRole && (
                <th className="py-3 px-4 font-medium text-gray-700 font-inter text-sm">Role</th>
              )}
              <th className="py-3 px-4 font-medium text-gray-700 font-inter text-sm">Status</th>
              <th className="py-3 px-4 font-medium text-gray-700 font-inter text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, idx) => (
              <tr key={member.email + idx} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-inter text-sm">
                  <div className="flex items-center gap-2">
                    {member.email}
                    {member.id === currentUserId && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        You
                      </span>
                    )}
                  </div>
                </td>
                {showRole && (
                  <td className="py-3 px-4 font-inter">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                      {member.role}
                    </span>
                  </td>
                )}
                <td className="py-3 px-4 font-inter">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    member.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : member.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td className="py-3 px-4 font-inter">
                  <div className="flex gap-2">
                    {member.status === 'Pending' && (
                      <button
                        onClick={() => copyInviteLink(member.email)}
                        className="text-[#FF6551] hover:text-[#ff7a6b] text-sm font-medium font-inter focus:outline-none hover:underline"
                      >
                        Copy Link
                      </button>
                    )}
                    {member.id !== currentUserId && currentUserRole === 'admin' && onRemoveMember && (
                      <button
                        onClick={() => onRemoveMember(member.id, member.email)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium font-inter focus:outline-none hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {teamMembers.some(member => member.status === 'Pending') && (
        <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-inter">
            <strong>Next steps:</strong> Send the invitation links to your team members so they can accept their invitations and create their accounts.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamMembersTable; 