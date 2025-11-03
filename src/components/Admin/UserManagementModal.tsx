import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Building, UserPlus, Edit, Trash2 } from 'lucide-react';
import { User as UserType, UserRole } from '../../types';
import { roleLabels } from '../../data/mockData';
import { supabaseAdmin } from '../../lib/supabaseAdminClient';
import { supabase } from '@/lib/supabaseClient';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateUser: (userId: string, userData: any) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  onUpdateUser,
  onDeleteUser
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [showEmailUpdateDialog, setShowEmailUpdateDialog] = useState(false);
  const [pendingEmailUpdate, setPendingEmailUpdate] = useState('');
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'client' as UserRole,
    department: '',
    isActive: true,
    password: '',
    teamLead: '',
  });

  // NEW: Fetch users when modal opens or tab changes to list
  useEffect(() => {
    if (isOpen && activeTab === 'list') {
      fetchUsers();
    }
  }, [isOpen, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
      // .order('created_at', { ascending: false });

      if (userError) throw userError;

      setUsers(userData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'client',
      department: '',
      isActive: true,
      password: '',
      teamLead: '',
    });
  };

  const onCreateUser = async (userData: any) => {
    try {
      // console.log("Creating user with data:", userData);
      // ✅ 1. Build verification URL with email parameter
      const redirectUrl = `https://ticketingtoolapplywizz.vercel.app/EmailVerifyRedirect?email=${encodeURIComponent(userData.email)}`;

      // ✅ 2. Sign up user with redirect
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: userData.name,
            role: userData.role,
            department: userData.department
          }
        }
      });

      if (signUpError) throw new Error(`Auth error: ${signUpError.message}`);

      // ✅ 3. Store email for fallback
      localStorage.setItem("applywizz_user_email", userData.email);

      // ✅ 4. If career_associate, send API request to external database
      if (userData.role === 'career_associate') {
        try {
          const apiUrl = `${import.meta.env.VITE_EXTERNAL_API_URL}/api/associate-create`;
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              manager: userData.teamLead,
              password: "Created@123",
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to create associate in external database:', errorData);
            // Don't throw error - allow user creation to succeed even if external API fails
          }
        } catch (apiError) {
          console.error('Error calling external API:', apiError);
          // Don't throw error - allow user creation to succeed even if external API fails
        }
      }

      return true;
    } catch (error: any) {
      console.error("User creation failed:", error);
      setError(`User creation failed: ${error.message}`);
      return false;
    }
  };





  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await onCreateUser(formData);
      if (success) {
        resetForm();
        setActiveTab('list');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || '',
      isActive: user.is_active, // Fixed: use is_active from DB
      password: '',
      teamLead: (user as any).team_lead || '',
    });
    setActiveTab('edit');
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if email has changed
    if (selectedUser && formData.email !== selectedUser.email) {
      setPendingEmailUpdate(formData.email);
      setShowEmailUpdateDialog(true);
    } else {
      // No email change, proceed with normal update
      if (selectedUser) {
        onUpdateUser(selectedUser.id, formData);
        resetForm();
        setSelectedUser(null);
        setActiveTab('list');
      }
    }
  };

  const confirmEmailUpdate = async () => {
    setShowEmailUpdateDialog(false);
    setLoading(true);
    setError('');
    setEmailUpdateSuccess('');

    try {
      // Call admin API to update user email
      const response = await fetch('/api/update-user-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser!.id,
          newEmail: pendingEmailUpdate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update email');
      }

      setEmailUpdateSuccess(
        `Email successfully updated to ${pendingEmailUpdate}. The user can now log in with their new email.`
      );

      // Update other user fields
      if (selectedUser) {
        onUpdateUser(selectedUser.id, { ...formData, email: pendingEmailUpdate });
      }

      // Refresh user list
      await fetchUsers();
      
      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
        setSelectedUser(null);
        setEmailUpdateSuccess('');
        setActiveTab('list');
      }, 3000);
      
    } catch (err: any) {
      setError(`Email update failed: ${err.message}`);
    } finally {
      setLoading(false);
      setPendingEmailUpdate('');
    }
  };

  const cancelEmailUpdate = () => {
    setShowEmailUpdateDialog(false);
    setPendingEmailUpdate('');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const departmentOptions = [
    'Sales',
    'Client Services',
    'Applications',
    'Resume',
    'Technology',
    'Operations',
    'Executive',
    'IT',
    'Quality Control'
  ];

  const teamLeadOptions = [
    'Sarika.TL@applywizz.com',
    'Ramadevi.TL@applywizz.com',
    'Saisree.TL@applywizz.com',
    'Nimsha.TL@applywizz.com',
    'manisha.TL@applywizz.com'
  ];

  const renderUserList = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          aria-label="Filter users by role"
        >
          <option value="all">All Roles</option>
          {Object.entries(roleLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => setActiveTab('create')}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <p>Loading users...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* User Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderUserForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleUpdateUser : handleCreateUser} className="space-y-6">
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {emailUpdateSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">
          <strong>Success:</strong> {emailUpdateSuccess}
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center space-x-2 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">
            {isEdit ? 'Edit User Information ' : 'Create New User'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="john.doe@applywizz.com"
              required
              disabled={loading}
            />
            {isEdit && selectedUser && formData.email !== selectedUser.email && (
              <p className="mt-1 text-xs text-orange-600">
                ⚠️ Email will be updated immediately (no verification required)
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-purple-900">Role & Permissions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="user-role-select" className="block text-sm font-medium text-gray-700 mb-2">
              User Role *
            </label>
            <select
              id="user-role-select"
              aria-label="User Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
              disabled={loading}
            >
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              disabled={loading}
              aria-label="Department"
            >
              <option value="">Select Department</option>
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {formData.role === 'career_associate' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Lead *
              </label>
              <select
                value={formData.teamLead}
                onChange={(e) => setFormData({ ...formData, teamLead: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required={formData.role === 'career_associate'}
                disabled={loading}
                aria-label="Team Lead"
              >
                <option value="">Select Team Lead</option>
                {teamLeadOptions.map(tl => (
                  <option key={tl} value={tl}>{tl}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center space-x-2 mb-4">
          <Building className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">Account Settings</h3>
        </div>

        <div className="space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Enter initial password"
                required={!isEdit}
                disabled={loading}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              disabled={loading}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Account is active
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setSelectedUser(null);
            setActiveTab('create');
          }}
          className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? 'Processing...' : (isEdit ? 'Update User' : 'Create User')}
        </button>
      </div>
    </form>
  );

  if (!isOpen) return null;

  return (
    <>
    {/* Email Update Confirmation Dialog */}
    {showEmailUpdateDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Confirm Email Change</h3>
          </div>
          
          <div className="space-y-4 mb-6">
            <p className="text-gray-700">
              Are you sure you want to change this user's email address?
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>User:</strong> {selectedUser?.name}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Current Email:</strong> {selectedUser?.email}
              </p>
              <p className="text-sm text-gray-900">
                <strong>New Email:</strong> {pendingEmailUpdate}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✅ The email will be updated immediately. No verification required.
              </p>
              <p className="text-sm text-green-800 mt-1">
                The user can log in with <strong>{pendingEmailUpdate}</strong> right away.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={cancelEmailUpdate}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmEmailUpdate}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              Confirm & Update Email
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600">Manage system users, roles, and permissions</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
            title="Close"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              disabled={loading}
            >
              User List ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              disabled={loading}
            >
              Create User
            </button>
            {activeTab === 'edit' && (
              <button
                className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
              >
                Edit User "**This FETURE IS NOT WORKING "
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'list' && renderUserList()}
          {activeTab === 'create' && renderUserForm(false)}
          {activeTab === 'edit' && renderUserForm(true)}
        </div>
      </div>
    </div>
    </>
  );
};