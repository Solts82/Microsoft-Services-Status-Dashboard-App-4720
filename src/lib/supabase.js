import { createClient } from '@supabase/supabase-js';

// Project credentials - will be auto-injected during deployment
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

if (SUPABASE_URL === 'https://your-project-id.supabase.co' || SUPABASE_ANON_KEY === 'your-anon-key') {
  console.warn('Supabase not configured - using demo mode');
}

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Authentication helpers
export const signUp = async (email, password) => {
  console.log('Sign up called with:', email);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  } catch (err) {
    console.error('Error during sign up:', err);
    return { data: null, error: err };
  }
};

export const signIn = async (email, password) => {
  console.log('Sign in called with:', email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (err) {
    console.error('Error during sign in:', err);
    return { data: null, error: err };
  }
};

export const signOut = async () => {
  console.log('Sign out called');
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    console.error('Error during sign out:', err);
    return { error: err };
  }
};

export const getCurrentUser = async () => {
  console.log('Get current user called');
  try {
    const { data, error } = await supabase.auth.getUser();
    return { user: data?.user || null, error };
  } catch (err) {
    console.error('Error getting current user:', err);
    return { user: null, error: err };
  }
};

// Service Health Database Operations
export const insertServiceAlert = async (alertData) => {
  console.log('Inserting service alert:', alertData);
  
  try {
    const { data, error } = await supabase
      .from('service_alerts_ms2024')
      .upsert([alertData], { 
        onConflict: 'external_id',
        ignoreDuplicates: false 
      });
    
    return { data, error };
  } catch (err) {
    console.error('Error inserting service alert:', err);
    return { data: null, error: err };
  }
};

export const updateServiceAlert = async (externalId, updateData) => {
  console.log('Updating service alert:', externalId, updateData);
  
  try {
    const { data, error } = await supabase
      .from('service_alerts_ms2024')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('external_id', externalId);
    
    return { data, error };
  } catch (err) {
    console.error('Error updating service alert:', err);
    return { data: null, error: err };
  }
};

export const getActiveAlerts = async () => {
  console.log('Fetching active alerts from database');
  
  try {
    const { data, error } = await supabase
      .from('service_alerts_ms2024')
      .select('*')
      .in('status', ['investigating', 'monitoring', 'identified'])
      .order('created_at', { ascending: false });
    
    return { data, error };
  } catch (err) {
    console.error('Error fetching active alerts:', err);
    return { data: [], error: err };
  }
};

export const getResolvedAlerts = async (dayLimit = 30) => {
  console.log('Fetching resolved alerts from database');
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dayLimit);
    
    const { data, error } = await supabase
      .from('service_alerts_ms2024')
      .select('*')
      .eq('status', 'resolved')
      .gte('resolved_at', cutoffDate.toISOString())
      .order('resolved_at', { ascending: false });
    
    return { data, error };
  } catch (err) {
    console.error('Error fetching resolved alerts:', err);
    return { data: [], error: err };
  }
};

export const getAllAlerts = async (limit = 1000, offset = 0) => {
  console.log('Fetching all alerts from database');
  
  try {
    const { data, error } = await supabase
      .from('service_alerts_ms2024')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data, error };
  } catch (err) {
    console.error('Error fetching all alerts:', err);
    return { data: [], error: err };
  }
};

export const searchAlerts = async (searchTerm, startDate = null, endDate = null) => {
  console.log('Searching alerts:', { searchTerm, startDate, endDate });
  
  try {
    let query = supabase
      .from('service_alerts_ms2024')
      .select('*');
    
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,impact.ilike.%${searchTerm}%,affected_services.cs.{${searchTerm}}`);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(500);
    
    return { data, error };
  } catch (err) {
    console.error('Error searching alerts:', err);
    return { data: [], error: err };
  }
};

// Monitoring System Operations
export const recordMonitoringRun = async (runData) => {
  console.log('Recording monitoring run:', runData);
  
  try {
    const { data, error } = await supabase
      .from('monitoring_runs_ms2024')
      .insert([runData]);
    
    return { data, error };
  } catch (err) {
    console.error('Error recording monitoring run:', err);
    return { data: null, error: err };
  }
};

export const getLastMonitoringRun = async () => {
  console.log('Getting last monitoring run');
  
  try {
    const { data, error } = await supabase
      .from('monitoring_runs_ms2024')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(1)
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('Error getting last monitoring run:', err);
    return { data: null, error: err };
  }
};

// Comments helpers
export const addComment = async (alertId, content, userId, username, isAnonymous) => {
  console.log('Add comment:', { alertId, content, userId, username, isAnonymous });
  
  try {
    const { data, error } = await supabase
      .from('alert_comments_ms2024')
      .insert([
        { 
          alert_id: alertId, 
          content, 
          user_id: isAnonymous ? null : userId, 
          username: isAnonymous ? 'Anonymous' : username,
          is_anonymous: isAnonymous
        }
      ]);
    
    return { data, error };
  } catch (err) {
    console.error('Error adding comment:', err);
    return { data: null, error: err };
  }
};

export const addCommentReply = async (parentId, alertId, content, userId, username, isAnonymous) => {
  console.log('Add comment reply:', { parentId, alertId, content, userId, username, isAnonymous });
  
  try {
    const { data, error } = await supabase
      .from('alert_comments_ms2024')
      .insert([
        { 
          alert_id: alertId, 
          content, 
          user_id: isAnonymous ? null : userId, 
          username: isAnonymous ? 'Anonymous' : username,
          is_anonymous: isAnonymous,
          parent_id: parentId
        }
      ]);
    
    return { data, error };
  } catch (err) {
    console.error('Error adding comment reply:', err);
    return { data: null, error: err };
  }
};

export const getComments = async (alertId) => {
  console.log('Get comments for alert:', alertId);
  
  try {
    const { data, error } = await supabase
      .from('alert_comments_ms2024')
      .select('*')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      return { data, error: null };
    }
    
    // Return mock comments for demo if no real data
    return { data: generateMockComments(alertId), error: null };
    
  } catch (err) {
    console.error('Error fetching comments:', err);
    return { data: generateMockComments(alertId), error: null };
  }
};

export const voteComment = async (commentId, userId, voteType) => {
  console.log('Vote on comment:', { commentId, userId, voteType });
  
  try {
    // First check if user already voted on this comment
    const { data: existingVote, error: fetchError } = await supabase
      .from('comment_votes_ms2024')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw fetchError;
    }

    // If vote exists, update it if different, or delete if same (toggle)
    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Delete the vote if user clicks the same vote type again (toggle off)
        const { error } = await supabase
          .from('comment_votes_ms2024')
          .delete()
          .eq('id', existingVote.id);
        
        return { error };
      } else {
        // Update to new vote type
        const { error } = await supabase
          .from('comment_votes_ms2024')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);
        
        return { error };
      }
    } 
    // Otherwise create a new vote
    else {
      const { error } = await supabase
        .from('comment_votes_ms2024')
        .insert([
          { comment_id: commentId, user_id: userId, vote_type: voteType }
        ]);
      
      return { error };
    }
  } catch (err) {
    console.error('Error voting on comment:', err);
    return { error: err };
  }
};

export const getCommentVotes = async (commentId) => {
  console.log('Get votes for comment:', commentId);
  
  try {
    const { data, error } = await supabase
      .from('comment_votes_ms2024')
      .select('*')
      .eq('comment_id', commentId);
    
    return { data, error };
  } catch (err) {
    console.error('Error fetching comment votes:', err);
    return { data: [], error: err };
  }
};

// Alert subscriptions
export const subscribeToAlerts = async (userId, regions) => {
  console.log('Subscribe to alerts:', userId, regions);
  
  try {
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('alert_subscriptions_ms2024')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingSubscription) {
      const { data, error } = await supabase
        .from('alert_subscriptions_ms2024')
        .update({ regions })
        .eq('user_id', userId);
      
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('alert_subscriptions_ms2024')
        .insert([
          { user_id: userId, regions }
        ]);
      
      return { data, error };
    }
  } catch (err) {
    console.error('Error managing alert subscriptions:', err);
    return { data: null, error: err };
  }
};

export const getAlertSubscriptions = async (userId) => {
  console.log('Get alert subscriptions for:', userId);
  
  try {
    const { data, error } = await supabase
      .from('alert_subscriptions_ms2024')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('Error fetching alert subscriptions:', err);
    return { data: null, error: err };
  }
};

// Profile management
export const updateUserProfile = async (userId, profileData) => {
  console.log('Update user profile:', { userId, profileData });
  
  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles_ms2024')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingProfile) {
      const { data, error } = await supabase
        .from('user_profiles_ms2024')
        .update(profileData)
        .eq('user_id', userId);
      
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('user_profiles_ms2024')
        .insert([
          { user_id: userId, ...profileData }
        ]);
      
      return { data, error };
    }
  } catch (err) {
    console.error('Error updating user profile:', err);
    return { data: null, error: err };
  }
};

export const getUserProfile = async (userId) => {
  console.log('Get user profile:', userId);
  
  try {
    const { data, error } = await supabase
      .from('user_profiles_ms2024')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return { data: null, error: err };
  }
};

// Helper function for mock comments (existing)
function generateMockComments(alertId) {
  const usernames = [
    'TechAdmin', 'CloudExpert', 'SystemEngineer',
    'DevOpsGuru', 'NetworkSpecialist', 'AzureArchitect'
  ];
  
  const commentTexts = [
    "We're experiencing this issue in our environment as well.",
    "Our team has confirmed this is affecting production workloads.",
    "Has anyone found a workaround for this issue yet?"
  ];
  
  const commentCount = Math.floor(Math.random() * 4) + 2;
  const comments = [];
  const now = Date.now();
  
  for (let i = 0; i < commentCount; i++) {
    const timeOffset = Math.floor(Math.random() * 24) * 3600000;
    comments.push({
      id: `mock-comment-${alertId}-${i}`,
      alert_id: alertId,
      user_id: null,
      username: usernames[Math.floor(Math.random() * usernames.length)],
      content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      is_anonymous: Math.random() > 0.7,
      created_at: new Date(now - timeOffset).toISOString(),
      parent_id: null
    });
  }
  
  return comments;
}

export default supabase;