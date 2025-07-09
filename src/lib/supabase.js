// Mock implementation for when Supabase isn't connected yet
console.log('Supabase client loaded (demo mode)');

// This is a mock implementation for development
export const supabase = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        order: () => ({ data: [], error: null })
      }),
      order: () => ({ data: [], error: null })
    }),
    insert: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
    update: () => ({
      eq: async () => ({ data: null, error: null })
    }),
    delete: () => ({
      eq: async () => ({ error: null })
    })
  })
};

// Authentication helpers
export const signUp = async (email, password) => {
  console.log('Sign up called with:', email);
  return { data: {}, error: null };
};

export const signIn = async (email, password) => {
  console.log('Sign in called with:', email);
  return { data: {}, error: null };
};

export const signOut = async () => {
  console.log('Sign out called');
  return { error: null };
};

export const getCurrentUser = async () => {
  console.log('Get current user called');
  return { user: null, error: null };
};

// Alerts subscription helpers
export const subscribeToAlerts = async (userId, regions) => {
  console.log('Subscribe to alerts:', userId, regions);
  return { data: {}, error: null };
};

export const getAlertSubscriptions = async (userId) => {
  console.log('Get alert subscriptions for:', userId);
  return { data: { regions: ['global'] }, error: null };
};

// Comments helpers
export const addComment = async (alertId, content, userId, username, isAnonymous) => {
  console.log('Add comment:', { alertId, content, userId, username, isAnonymous });
  return { data: {}, error: null };
};

export const getComments = async (alertId) => {
  console.log('Get comments for alert:', alertId);
  // Return mock comments data
  const mockComments = [
    {
      id: 'c1',
      alert_id: alertId,
      content: 'This is affecting our production environment. Any ETA on resolution?',
      user_id: 'u1',
      username: 'JohnDoe',
      is_anonymous: false,
      created_at: new Date().toISOString(),
      parent_id: null
    },
    {
      id: 'c2',
      alert_id: alertId,
      content: 'We are experiencing the same issue in the EU region.',
      user_id: null,
      username: 'Anonymous',
      is_anonymous: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      parent_id: null
    },
    {
      id: 'c3',
      alert_id: alertId,
      content: 'Our team is also investigating this from our side.',
      user_id: 'u3',
      username: 'SupportTeam',
      is_anonymous: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      parent_id: 'c1'
    }
  ];
  return { data: mockComments, error: null };
};

export const addCommentReply = async (parentId, alertId, content, userId, username, isAnonymous) => {
  console.log('Add comment reply:', { parentId, alertId, content, userId, username, isAnonymous });
  return { data: {}, error: null };
};

export const voteComment = async (commentId, userId, voteType) => {
  console.log('Vote on comment:', { commentId, userId, voteType });
  return { error: null };
};

export const getCommentVotes = async (commentId) => {
  console.log('Get votes for comment:', commentId);
  return { data: [], error: null };
};

// Profile management
export const updateUserProfile = async (userId, profileData) => {
  console.log('Update user profile:', { userId, profileData });
  return { data: {}, error: null };
};

export const getUserProfile = async (userId) => {
  console.log('Get user profile:', userId);
  return { 
    data: {
      display_name: 'Demo User',
      notification_email: 'demo@example.com'
    }, 
    error: null 
  };
};