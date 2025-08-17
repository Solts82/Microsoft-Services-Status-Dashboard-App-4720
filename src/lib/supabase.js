import { createClient } from '@supabase/supabase-js';

// Supabase configuration - These are the actual credentials from your project
const SUPABASE_URL = 'https://ceqlnmraiismxsprgrio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcWxubXJhaWlzbXhzcHJncmlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNzExMjEsImV4cCI6MjA3MDk0NzEyMX0.V0vWLuDZ-1IKHjfBwwTDBcQctYieebl3fdLn7R3-a3A';

// Validate configuration
const isConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && 
                    SUPABASE_URL.includes('supabase.co') && 
                    SUPABASE_ANON_KEY.startsWith('eyJ');

if (!isConfigured) {
  console.error('❌ Supabase not properly configured');
  console.log('Current URL:', SUPABASE_URL);
  console.log('Key starts with eyJ:', SUPABASE_ANON_KEY?.startsWith('eyJ'));
  throw new Error('Supabase configuration is invalid');
} else {
  console.log('✅ Supabase configuration validated');
}

// Initialize Supabase client with optimized settings
let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'microsoft-service-health-dashboard'
      },
      // Reduce timeout for faster feedback
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
      }
    },
    realtime: {
      // Disable realtime for faster initial load
      params: {
        eventsPerSecond: 10
      }
    }
  });

  console.log('✅ Supabase client initialized successfully');

} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error);
  throw error;
}

// Enhanced authentication functions with better error handling and timeouts
export const signUp = async (email, password) => {
  console.log('🔐 Attempting sign up for:', email);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/#/auth/callback`
      }
    });
    
    clearTimeout(timeoutId);
    
    if (error) throw error;
    console.log('✅ Sign up successful');
    return { data, error: null };
  } catch (err) {
    console.error('❌ Sign up failed:', err);
    if (err.name === 'AbortError') {
      return { data: null, error: new Error('Request timed out. Please check your internet connection.') };
    }
    return { data: null, error: err };
  }
};

export const signIn = async (email, password) => {
  console.log('🔐 Attempting sign in for:', email);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    clearTimeout(timeoutId);
    
    if (error) throw error;
    console.log('✅ Sign in successful');
    return { data, error: null };
  } catch (err) {
    console.error('❌ Sign in failed:', err);
    if (err.name === 'AbortError') {
      return { data: null, error: new Error('Request timed out. Please check your internet connection.') };
    }
    return { data: null, error: err };
  }
};

export const signOut = async () => {
  console.log('🚪 Signing out...');
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    console.log('✅ Sign out successful');
    return { error: null };
  } catch (err) {
    console.error('❌ Sign out failed:', err);
    return { error: err };
  }
};

// Optimized getCurrentUser with faster timeout
export const getCurrentUser = async () => {
  try {
    console.log('🔍 Getting current user...');
    
    // First try to get session (faster than getUser)
    const { data: { session }, error: sessionError } = await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 5000)
      )
    ]);

    if (sessionError) {
      console.warn('Session check failed:', sessionError);
      return { user: null, error: sessionError };
    }

    if (session?.user) {
      console.log('✅ User found from session:', session.user.email);
      return { user: session.user, error: null };
    }

    console.log('ℹ️ No active session found');
    return { user: null, error: null };

  } catch (err) {
    console.error('❌ Get user failed:', err);
    if (err.message === 'Session check timeout') {
      return { user: null, error: new Error('Connection timeout - continuing without authentication') };
    }
    return { user: null, error: err };
  }
};

export const resetPassword = async (email) => {
  console.log('🔑 Password reset requested for:', email);
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/auth/reset-password`
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Password reset failed:', err);
    return { data: null, error: err };
  }
};

// Password update function
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Password update failed:', err);
    return { data: null, error: err };
  }
};

// Email confirmation functions
export const confirmEmail = async (token, type) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type || 'signup'
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Email confirmation failed:', err);
    return { data: null, error: err };
  }
};

export const verifyPasswordResetToken = async (token, type) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type || 'recovery'
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    return { data: null, error: err };
  }
};

// Database functions with better error handling - LIVE DATA ONLY
export const getActiveAlerts = async () => {
  try {
    console.log('📡 Fetching active alerts from database...');
    const { data, error } = await Promise.race([
      supabase
        .from('service_alerts_ms2024')
        .select('*')
        .in('status', ['investigating', 'monitoring', 'identified'])
        .order('created_at', { ascending: false }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      )
    ]);

    if (error) {
      console.error('Database query failed:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} active alerts in database`);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('❌ Error fetching active alerts:', err);
    throw err;
  }
};

export const getResolvedAlerts = async (dayLimit = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dayLimit);

    const { data, error } = await Promise.race([
      supabase
        .from('service_alerts_ms2024')
        .select('*')
        .eq('status', 'resolved')
        .gte('resolved_at', cutoffDate.toISOString())
        .order('resolved_at', { ascending: false }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      )
    ]);

    if (error) {
      console.error('Database query failed:', error);
      throw error;
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('❌ Error fetching resolved alerts:', err);
    throw err;
  }
};

export const insertServiceAlert = async (alertData) => {
  try {
    const { data, error } = await supabase
      .from('service_alerts_ms2024')
      .upsert([alertData], { 
        onConflict: 'external_id',
        ignoreDuplicates: false 
      });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error inserting alert:', err);
    return { data: null, error: err };
  }
};

export const updateServiceAlert = async (externalId, updateData) => {
  try {
    const { data, error } = await supabase
      .from('service_alerts_ms2024')
      .update(updateData)
      .eq('external_id', externalId);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error updating alert:', err);
    return { data: null, error: err };
  }
};

export const recordMonitoringRun = async (runData) => {
  try {
    const { data, error } = await supabase
      .from('monitoring_runs_ms2024')
      .insert([runData]);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error recording monitoring run:', err);
    return { data: null, error: err };
  }
};

export const getLastMonitoringRun = async () => {
  try {
    const { data, error } = await supabase
      .from('monitoring_runs_ms2024')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data: data || null, error: null };
  } catch (err) {
    console.error('❌ Error getting last monitoring run:', err);
    return { data: null, error: err };
  }
};

// User Profile Functions
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles_ms2024')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('❌ Error getting user profile:', err);
    return { data: null, error: err };
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles_ms2024')
      .upsert([{ user_id: userId, ...profileData }], {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error updating user profile:', err);
    return { data: null, error: err };
  }
};

// Enhanced User Profile Functions
export const getEnhancedUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles_enhanced_ms2024')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('❌ Error getting enhanced user profile:', err);
    return { data: null, error: err };
  }
};

export const updateEnhancedUserProfile = async (userId, profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles_enhanced_ms2024')
      .upsert([{ user_id: userId, ...profileData, updated_at: new Date().toISOString() }], {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error updating enhanced user profile:', err);
    return { data: null, error: err };
  }
};

// File Upload Functions
export const uploadFile = async (file, userId, uploadType = 'general') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${uploadType}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('user-files')
      .getPublicUrl(fileName);

    const { error: recordError } = await supabase
      .from('file_uploads_ms2024')
      .insert([{
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: urlData.publicUrl,
        upload_type: uploadType
      }]);

    if (recordError) {
      console.warn('Failed to record file upload:', recordError);
    }

    return { 
      data: { 
        url: urlData.publicUrl, 
        path: fileName 
      }, 
      error: null 
    };
  } catch (err) {
    console.error('❌ Error uploading file:', err);
    return { data: null, error: err };
  }
};

// Activity Logging Functions
export const logUserActivity = async (userId, action, details = {}) => {
  try {
    const { data, error } = await supabase
      .from('user_activity_logs_ms2024')
      .insert([{
        user_id: userId,
        action,
        details,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error logging user activity:', err);
    return { data: null, error: err };
  }
};

export const getUserActivityLogs = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('user_activity_logs_ms2024')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('❌ Error getting user activity logs:', err);
    return { data: [], error: err };
  }
};

// Alert Subscription Functions
export const getAlertSubscriptions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('alert_subscriptions_ms2024')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('❌ Error getting alert subscriptions:', err);
    return { data: null, error: err };
  }
};

export const subscribeToAlerts = async (userId, regions, severityFilter = ['high', 'critical']) => {
  try {
    const { data, error } = await supabase
      .from('alert_subscriptions_ms2024')
      .upsert([{
        user_id: userId,
        regions,
        severity_filter: severityFilter,
        email_notifications: true,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error updating alert subscriptions:', err);
    return { data: null, error: err };
  }
};

// Admin Functions
export const checkUserRole = async (userId) => {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('admin_users_ms2024')
        .select('role, permissions')
        .eq('user_id', userId)
        .single(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Role check timeout')), 5000)
      )
    ]);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data: data || { role: 'user', permissions: [] }, error: null };
  } catch (err) {
    console.warn('Role check failed:', err.message);
    return { data: { role: 'user', permissions: [] }, error: null };
  }
};

export const getAllUsers = async (limit = 100, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('admin_users_overview')
      .select('*')
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('❌ Error getting all users:', err);
    return { data: [], error: err };
  }
};

export const searchUsers = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('admin_users_overview')
      .select('*')
      .or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('❌ Error searching users:', err);
    return { data: [], error: err };
  }
};

export const suspendUser = async (userId, reason, adminId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles_enhanced_ms2024')
      .update({
        is_suspended: true,
        suspended_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminId
      })
      .eq('user_id', userId);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error suspending user:', err);
    return { data: null, error: err };
  }
};

export const reactivateUser = async (userId, adminId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles_enhanced_ms2024')
      .update({
        is_suspended: false,
        suspended_reason: null,
        suspended_at: null,
        suspended_by: null
      })
      .eq('user_id', userId);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('❌ Error reactivating user:', err);
    return { data: null, error: err };
  }
};

export const deleteUser = async (userId, adminId) => {
  try {
    const result = await suspendUser(userId, 'Account deleted by admin', adminId);
    return result;
  } catch (err) {
    console.error('❌ Error deleting user:', err);
    return { data: null, error: err };
  }
};

// Comments functions
export const getComments = async (alertId) => {
  try {
    const { data, error } = await supabase
      .from('alert_comments_ms2024')
      .select('*')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (err) {
    return { data: [], error: err };
  }
};

export const addComment = async (alertId, content, userId, username, isAnonymous) => {
  try {
    const { data, error } = await supabase
      .from('alert_comments_ms2024')
      .insert([{
        alert_id: alertId,
        content,
        user_id: isAnonymous ? null : userId,
        username: isAnonymous ? 'Anonymous' : username,
        is_anonymous: isAnonymous
      }]);

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const addCommentReply = async (parentId, alertId, content, userId, username, isAnonymous) => {
  try {
    const { data, error } = await supabase
      .from('alert_comments_ms2024')
      .insert([{
        alert_id: alertId,
        content,
        user_id: isAnonymous ? null : userId,
        username: isAnonymous ? 'Anonymous' : username,
        is_anonymous: isAnonymous,
        parent_id: parentId
      }]);

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const voteComment = async (commentId, userId, voteType) => {
  try {
    const { data, error } = await supabase
      .from('comment_votes_ms2024')
      .upsert([{
        comment_id: commentId,
        user_id: userId,
        vote_type: voteType
      }], {
        onConflict: 'comment_id,user_id'
      });

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// Export configuration status
export const isSupabaseConfigured = () => isConfigured;

export default supabase;