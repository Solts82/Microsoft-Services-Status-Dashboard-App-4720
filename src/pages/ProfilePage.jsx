import React,{useState,useEffect} from 'react';
import {motion} from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import {getEnhancedUserProfile,updateEnhancedUserProfile,uploadFile,logUserActivity,getCurrentUser} from '../lib/supabase';
import {format} from 'date-fns';

const {FiUser,FiSave,FiCamera,FiPhone,FiMapPin,FiGlobe,FiCalendar,FiMail,FiEdit3,FiAlertCircle,FiCheckCircle,FiUpload}=FiIcons;

const ProfilePage=()=> {
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState({
    display_name: '',
    bio: '',
    phone: '',
    location: '',
    website: '',
    date_of_birth: '',
    notification_email: '',
    timezone: 'UTC'
  });
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState(null);
  const [success,setSuccess]=useState(null);
  const [avatarUrl,setAvatarUrl]=useState(null);
  const [isEditing,setIsEditing]=useState(false);

  useEffect(()=> {
    loadUserProfile();
  },[]);

  const loadUserProfile=async ()=> {
    try {
      setLoading(true);
      
      // Get current user
      const {user: currentUser,error: userError}=await getCurrentUser();
      if (userError || !currentUser) {
        setError('Please sign in to view your profile');
        return;
      }
      
      setUser(currentUser);
      
      // Get enhanced profile
      const {data: profileData,error: profileError}=await getEnhancedUserProfile(currentUser.id);
      
      if (profileError && profileError.code !=='PGRST116') {
        throw profileError;
      }
      
      if (profileData) {
        setProfile({
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          website: profileData.website || '',
          date_of_birth: profileData.date_of_birth || '',
          notification_email: profileData.notification_email || currentUser.email || '',
          timezone: profileData.timezone || 'UTC'
        });
        setAvatarUrl(profileData.avatar_url);
      } else {
        // Initialize with user email
        setProfile(prev=> ({
          ...prev,
          notification_email: currentUser.email || ''
        }));
      }
    } catch (err) {
      console.error('Error loading profile:',err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange=(e)=> {
    const {name,value}=e.target;
    setProfile(prev=> ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpload=async (e)=> {
    const file=e.target.files[0];
    if (!file || !user) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const {data: uploadData,error: uploadError}=await uploadFile(file,user.id,'avatar');
      
      if (uploadError) throw uploadError;

      setAvatarUrl(uploadData.url);
      
      // Update profile with new avatar URL
      await updateEnhancedUserProfile(user.id,{avatar_url: uploadData.url});
      
      // Log activity
      await logUserActivity(user.id,'avatar_updated');
      
      setSuccess('Profile picture updated successfully');
      setTimeout(()=> setSuccess(null),3000);
    } catch (err) {
      console.error('Error uploading avatar:',err);
      setError('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile=async (e)=> {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      const {error: updateError}=await updateEnhancedUserProfile(user.id,profile);
      
      if (updateError) throw updateError;

      // Log activity
      await logUserActivity(user.id,'profile_updated');

      setSuccess('Profile updated successfully');
      setIsEditing(false);
      setTimeout(()=> setSuccess(null),3000);
    } catch (err) {
      console.error('Error saving profile:',err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiAlertCircle} className="text-red-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please sign in to view and manage your profile.
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
        <div className="max-w-4xl mx-auto">
          
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="h-32 bg-gradient-to-r from-microsoft-blue to-blue-600"></div>
            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 mb-6">
                
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <SafeIcon icon={FiUser} className="text-gray-400 text-4xl" />
                      </div>
                    )}
                  </div>
                  
                  {/* Upload Avatar Button */}
                  <label className="absolute bottom-2 right-2 w-8 h-8 bg-microsoft-blue text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <SafeIcon icon={uploading ? FiUpload : FiCamera} className={uploading ? 'animate-pulse' : ''} />
                  </label>
                </div>

                {/* Basic Info */}
                <div className="sm:ml-6 mt-4 sm:mt-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {profile.display_name || user.email?.split('@')[0] || 'User'}
                      </h1>
                      <p className="text-gray-600">{user.email}</p>
                      {profile.location && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <SafeIcon icon={FiMapPin} />
                          <span>{profile.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={()=> setIsEditing(!isEditing)}
                      className="mt-4 sm:mt-0 px-4 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <SafeIcon icon={FiEdit3} />
                      <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                    </button>
                  </div>
                  
                  {profile.bio && (
                    <p className="mt-3 text-gray-700">{profile.bio}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                    <span>Joined {format(new Date(user.created_at),'MMM yyyy')}</span>
                    {user.last_sign_in_at && (
                      <span>Last active {format(new Date(user.last_sign_in_at),'MMM dd, yyyy')}</span>
                    )}
                  </div>
                </div>
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

          {/* Profile Form */}
          {isEditing && (
            <motion.div
              initial={{opacity: 0,y: 20}}
              animate={{opacity: 1,y: 0}}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Profile</h2>
              
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      name="display_name"
                      value={profile.display_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                      placeholder="Your display name"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <SafeIcon icon={FiPhone} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={profile.phone}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <SafeIcon icon={FiMapPin} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        name="location"
                        value={profile.location}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <div className="relative">
                      <SafeIcon icon={FiGlobe} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="url"
                        name="website"
                        value={profile.website}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <SafeIcon icon={FiCalendar} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="date"
                        name="date_of_birth"
                        value={profile.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                      />
                    </div>
                  </div>

                  {/* Notification Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Email
                    </label>
                    <div className="relative">
                      <SafeIcon icon={FiMail} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="email"
                        name="notification_email"
                        value={profile.notification_email}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                        placeholder="notifications@email.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={profile.timezone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Central European Time</option>
                    <option value="Asia/Tokyo">Japan Standard Time</option>
                    <option value="Australia/Sydney">Australian Eastern Time</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={()=> setIsEditing(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SafeIcon icon={FiSave} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Profile Stats */}
          {!isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Email Verified</span>
                    <div className="flex items-center gap-1">
                      <SafeIcon 
                        icon={user.email_confirmed_at ? FiCheckCircle : FiAlertCircle} 
                        className={user.email_confirmed_at ? 'text-green-500' : 'text-yellow-500'} 
                      />
                      <span className={`text-sm ${user.email_confirmed_at ? 'text-green-600' : 'text-yellow-600'}`}>
                        {user.email_confirmed_at ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Account Type</span>
                    <span className="text-sm font-medium text-gray-900">Standard</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="text-sm font-medium text-gray-900">
                      {format(new Date(user.created_at),'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Info</h3>
                <div className="space-y-3">
                  {profile.phone && (
                    <div className="flex items-center gap-2">
                      <SafeIcon icon={FiPhone} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{profile.phone}</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-2">
                      <SafeIcon icon={FiMapPin} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{profile.location}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-2">
                      <SafeIcon icon={FiGlobe} className="text-gray-400" />
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-microsoft-blue hover:underline"
                      >
                        {profile.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Timezone</span>
                    <span className="text-sm font-medium text-gray-900">{profile.timezone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Notifications</span>
                    <span className="text-sm text-green-600">Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;