import React,{useState,useEffect} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getCurrentUser,
  checkUserRole,
  getAllUsers,
  searchUsers,
  suspendUser,
  reactivateUser,
  deleteUser,
  getUserActivityLogs
} from '../lib/supabase';
import {format,formatDistanceToNow} from 'date-fns';

const {
  FiUsers,FiSearch,FiMoreVertical,FiEye,FiUserX,FiUserCheck,FiTrash2,
  FiAlertCircle,FiCheckCircle,FiShield,FiActivity,FiMail,FiMapPin,
  FiCalendar,FiClock,FiFilter,FiRefreshCw
}=FiIcons;

const AdminPage=()=> {
  const [user,setUser]=useState(null);
  const [userRole,setUserRole]=useState(null);
  const [users,setUsers]=useState([]);
  const [filteredUsers,setFilteredUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [searching,setSearching]=useState(false);
  const [error,setError]=useState(null);
  const [success,setSuccess]=useState(null);
  const [searchTerm,setSearchTerm]=useState('');
  const [filterStatus,setFilterStatus]=useState('all');
  const [selectedUser,setSelectedUser]=useState(null);
  const [showUserModal,setShowUserModal]=useState(false);
  const [userActivity,setUserActivity]=useState([]);
  const [actionLoading,setActionLoading]=useState(null);

  useEffect(()=> {
    initializeAdmin();
  },[]);

  useEffect(()=> {
    filterUsersList();
  },[users,searchTerm,filterStatus]);

  const initializeAdmin=async ()=> {
    try {
      setLoading(true);
      
      // Get current user
      const {user: currentUser,error: userError}=await getCurrentUser();
      if (userError || !currentUser) {
        setError('Please sign in to access admin panel');
        return;
      }
      
      setUser(currentUser);
      
      // Check if user has admin role
      const {data: roleData,error: roleError}=await checkUserRole(currentUser.id);
      if (roleError) {
        throw roleError;
      }
      
      if (!roleData || roleData.role==='user') {
        setError('Access denied. Admin privileges required.');
        return;
      }
      
      setUserRole(roleData);
      
      // Load all users
      await loadUsers();
      
    } catch (err) {
      console.error('Error initializing admin:',err);
      setError('Failed to initialize admin panel');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers=async ()=> {
    try {
      const {data,error}=await getAllUsers(100,0);
      if (error) throw error;
      
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:',err);
      setError('Failed to load users');
    }
  };

  const filterUsersList=()=> {
    let filtered=users;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term=searchTerm.toLowerCase();
      filtered=filtered.filter(user=> 
        user.email?.toLowerCase().includes(term) ||
        user.display_name?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (filterStatus !=='all') {
      switch (filterStatus) {
        case 'active':
          filtered=filtered.filter(user=> user.is_active && !user.is_suspended);
          break;
        case 'suspended':
          filtered=filtered.filter(user=> user.is_suspended);
          break;
        case 'admin':
          filtered=filtered.filter(user=> user.is_admin);
          break;
        case 'unverified':
          filtered=filtered.filter(user=> !user.email_confirmed_at);
          break;
      }
    }
    
    setFilteredUsers(filtered);
  };

  const handleSearch=async (term)=> {
    if (!term.trim()) {
      setSearchTerm('');
      return;
    }
    
    try {
      setSearching(true);
      const {data,error}=await searchUsers(term);
      if (error) throw error;
      
      setUsers(data || []);
      setSearchTerm(term);
    } catch (err) {
      console.error('Error searching users:',err);
      setError('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleUserAction=async (userId,action,reason='')=> {
    if (!user || !userRole) return;
    
    try {
      setActionLoading(action + userId);
      setError(null);
      
      let result;
      switch (action) {
        case 'suspend':
          result=await suspendUser(userId,reason,user.id);
          break;
        case 'reactivate':
          result=await reactivateUser(userId,user.id);
          break;
        case 'delete':
          if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
          }
          result=await deleteUser(userId,user.id);
          break;
        default:
          return;
      }
      
      if (result.error) throw result.error;
      
      setSuccess(`User ${action}d successfully`);
      setTimeout(()=> setSuccess(null),3000);
      
      // Reload users
      await loadUsers();
      
    } catch (err) {
      console.error(`Error ${action}ing user:`,err);
      setError(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewUser=async (selectedUser)=> {
    try {
      setSelectedUser(selectedUser);
      setShowUserModal(true);
      
      // Load user activity
      const {data: activityData,error: activityError}=await getUserActivityLogs(selectedUser.auth_id);
      if (activityError) {
        console.error('Error loading user activity:',activityError);
      } else {
        setUserActivity(activityData || []);
      }
    } catch (err) {
      console.error('Error viewing user:',err);
    }
  };

  const getUserStatusBadge=(user)=> {
    if (user.is_suspended) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Suspended</span>;
    }
    if (!user.email_confirmed_at) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Unverified</span>;
    }
    if (user.is_admin) {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Admin</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !userRole || userRole.role==='user') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header user={user} />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiAlertCircle} className="text-red-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 mb-6">
              {error || 'You do not have permission to access the admin panel.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header user={user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Admin Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiShield} className="text-purple-600 text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-gray-600">Manage users and system settings</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-medium text-gray-900">{user.email}</p>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {userRole.role.replace('_',' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <SafeIcon icon={FiAlertCircle} className="flex-shrink-0 text-red-500" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <SafeIcon icon={FiCheckCircle} className="flex-shrink-0 text-green-500" />
              <p>{success}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <SafeIcon icon={FiUsers} className="text-blue-500 text-2xl" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u=> u.is_active && !u.is_suspended).length}
                  </p>
                </div>
                <SafeIcon icon={FiUserCheck} className="text-green-500 text-2xl" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Suspended</p>
                  <p className="text-2xl font-bold text-red-600">
                    {users.filter(u=> u.is_suspended).length}
                  </p>
                </div>
                <SafeIcon icon={FiUserX} className="text-red-500 text-2xl" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {users.filter(u=> u.is_admin).length}
                  </p>
                </div>
                <SafeIcon icon={FiShield} className="text-purple-500 text-2xl" />
              </div>
            </div>
          </div>

          {/* Users Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                
                <div className="flex gap-3 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 sm:w-64">
                    <SafeIcon icon={FiSearch} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                      value={searchTerm}
                      onChange={(e)=> setSearchTerm(e.target.value)}
                      onKeyPress={(e)=> e.key==='Enter' && handleSearch(searchTerm)}
                    />
                  </div>
                  
                  {/* Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e)=> setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="admin">Admins</option>
                    <option value="unverified">Unverified</option>
                  </select>
                  
                  {/* Refresh */}
                  <button
                    onClick={loadUsers}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <SafeIcon icon={FiRefreshCw} />
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((userData)=> (
                    <tr key={userData.auth_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {userData.avatar_url ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={userData.avatar_url}
                                alt=""
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <SafeIcon icon={FiUsers} className="text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userData.display_name || userData.email?.split('@')[0]}
                            </div>
                            <div className="text-sm text-gray-500">{userData.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getUserStatusBadge(userData)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(userData.registered_at),'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userData.last_sign_in_at ? 
                          formatDistanceToNow(new Date(userData.last_sign_in_at)) + ' ago' : 
                          'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={()=> handleViewUser(userData)}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <SafeIcon icon={FiEye} />
                          </button>
                          
                          {!userData.is_suspended ? (
                            <button
                              onClick={()=> handleUserAction(userData.auth_id,'suspend','Admin action')}
                              disabled={actionLoading==='suspend' + userData.auth_id}
                              className="text-yellow-600 hover:text-yellow-900 p-1 hover:bg-yellow-50 rounded disabled:opacity-50"
                              title="Suspend User"
                            >
                              <SafeIcon icon={FiUserX} />
                            </button>
                          ) : (
                            <button
                              onClick={()=> handleUserAction(userData.auth_id,'reactivate')}
                              disabled={actionLoading==='reactivate' + userData.auth_id}
                              className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded disabled:opacity-50"
                              title="Reactivate User"
                            >
                              <SafeIcon icon={FiUserCheck} />
                            </button>
                          )}
                          
                          {userRole.role==='super_admin' && (
                            <button
                              onClick={()=> handleUserAction(userData.auth_id,'delete')}
                              disabled={actionLoading==='delete' + userData.auth_id}
                              className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Delete User"
                            >
                              <SafeIcon icon={FiTrash2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length===0 && (
                <div className="text-center py-12">
                  <SafeIcon icon={FiUsers} className="mx-auto text-gray-400 text-4xl mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? 'Try adjusting your search criteria' : 'No users match the selected filter'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* User Detail Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={()=> setShowUserModal(false)}
            />
            
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{opacity: 0,scale: 0.9,y: 20}}
                animate={{opacity: 1,scale: 1,y: 0}}
                exit={{opacity: 0,scale: 0.9,y: 20}}
                className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e)=> e.stopPropagation()}
              >
                
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {selectedUser.avatar_url ? (
                          <img
                            src={selectedUser.avatar_url}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <SafeIcon icon={FiUsers} className="text-gray-400 text-xl" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedUser.display_name || selectedUser.email?.split('@')[0]}
                        </h2>
                        <p className="text-gray-600">{selectedUser.email}</p>
                        <div className="mt-2">
                          {getUserStatusBadge(selectedUser)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={()=> setShowUserModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* User Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <SafeIcon icon={FiMail} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{selectedUser.email}</span>
                        </div>
                        {selectedUser.phone && (
                          <div className="flex items-center gap-2">
                            <SafeIcon icon={FiUsers} className="text-gray-400" />
                            <span className="text-sm text-gray-700">{selectedUser.phone}</span>
                          </div>
                        )}
                        {selectedUser.location && (
                          <div className="flex items-center gap-2">
                            <SafeIcon icon={FiMapPin} className="text-gray-400" />
                            <span className="text-sm text-gray-700">{selectedUser.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <SafeIcon icon={FiCalendar} className="text-gray-400" />
                          <span className="text-sm text-gray-700">
                            Joined {format(new Date(selectedUser.registered_at),'MMM dd, yyyy')}
                          </span>
                        </div>
                        {selectedUser.last_sign_in_at && (
                          <div className="flex items-center gap-2">
                            <SafeIcon icon={FiClock} className="text-gray-400" />
                            <span className="text-sm text-gray-700">
                              Last active {formatDistanceToNow(new Date(selectedUser.last_sign_in_at))} ago
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userActivity.length > 0 ? (
                          userActivity.slice(0,10).map((activity)=> (
                            <div key={activity.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                              <SafeIcon icon={FiActivity} className="text-gray-400 mt-0.5 text-sm" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-700">{activity.action.replace('_',' ')}</p>
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(activity.created_at))} ago
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No recent activity</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedUser.bio && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Bio</h3>
                      <p className="text-gray-700">{selectedUser.bio}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;