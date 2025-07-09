import { createClient } from '@supabase/supabase-js';

// Project URL and anon key will be auto-injected during deployment
const SUPABASE_URL = 'https://<PROJECT-ID>.supabase.co';
const SUPABASE_ANON_KEY = '<ANON_KEY>';

if (SUPABASE_URL === 'https://<PROJECT-ID>.supabase.co' || SUPABASE_ANON_KEY === '<ANON_KEY>') {
  console.warn('Missing Supabase credentials. Using demo mode.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Authentication helpers
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
};

// Alerts subscription helpers
export const subscribeToAlerts = async (userId, regions) => {
  const { data, error } = await supabase
    .from('alert_subscriptions')
    .upsert({ 
      user_id: userId,
      regions: regions
    });
  return { data, error };
};

export const getAlertSubscriptions = async (userId) => {
  const { data, error } = await supabase
    .from('alert_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
};

// Comments helpers
export const addComment = async (alertId, content, userId, username, isAnonymous) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([
      { 
        alert_id: alertId, 
        content, 
        user_id: userId || null,
        username: isAnonymous ? 'Anonymous' : username,
        is_anonymous: isAnonymous
      }
    ]);
  return { data, error };
};

export const getComments = async (alertId) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('alert_id', alertId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const addCommentReply = async (parentId, alertId, content, userId, username, isAnonymous) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([
      { 
        parent_id: parentId,
        alert_id: alertId, 
        content, 
        user_id: userId || null,
        username: isAnonymous ? 'Anonymous' : username,
        is_anonymous: isAnonymous
      }
    ]);
  return { data, error };
};

export const voteComment = async (commentId, userId, voteType) => {
  // Check if user already voted
  const { data: existingVote } = await supabase
    .from('comment_votes')
    .select('*')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();
  
  if (existingVote) {
    // Update existing vote
    if (existingVote.vote_type === voteType) {
      // Remove vote if clicking the same button
      const { error } = await supabase
        .from('comment_votes')
        .delete()
        .eq('id', existingVote.id);
      return { error };
    } else {
      // Change vote type
      const { error } = await supabase
        .from('comment_votes')
        .update({ vote_type: voteType })
        .eq('id', existingVote.id);
      return { error };
    }
  } else {
    // Create new vote
    const { error } = await supabase
      .from('comment_votes')
      .insert([{ comment_id: commentId, user_id: userId, vote_type: voteType }]);
    return { error };
  }
};

export const getCommentVotes = async (commentId) => {
  const { data, error } = await supabase
    .from('comment_votes')
    .select('*')
    .eq('comment_id', commentId);
  return { data, error };
};

// Profile management
export const updateUserProfile = async (userId, profileData) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ 
      id: userId, 
      ...profileData 
    });
  return { data, error };
};

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};