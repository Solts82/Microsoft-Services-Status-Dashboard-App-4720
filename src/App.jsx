import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AlertDetailPage from './pages/AlertDetailPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { getCurrentUser, checkUserRole } from './lib/supabase';
import supabase from './lib/supabase';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    let progressInterval;

    const checkUser = async () => {
      try {
        console.log('🔍 Checking user auth state...');
        
        // Start progress animation
        progressInterval = setInterval(() => {
          if (mounted) {
            setLoadingProgress(prev => {
              if (prev < 90) return prev + 2;
              return prev;
            });
          }
        }, 100);

        // Quick auth check with timeout
        try {
          const { user: currentUser, error } = await getCurrentUser();
          
          if (!mounted) return;
          
          if (error) {
            console.warn('⚠️ Auth check failed:', error.message);
            setAuthError(`Connection issue: ${error.message}`);
          }

          if (currentUser) {
            setUser(currentUser);
            console.log('✅ User authenticated:', currentUser.email);
            
            // Try to check user role quickly
            try {
              const { data: roleData } = await checkUserRole(currentUser.id);
              if (mounted) {
                setUserRole(roleData);
              }
            } catch (roleError) {
              console.warn('⚠️ Role check failed:', roleError.message);
              // Continue without role data
            }
          } else {
            console.log('ℹ️ No user authenticated - continuing as guest');
          }

        } catch (authErr) {
          console.error('❌ Auth check error:', authErr);
          if (mounted) {
            setAuthError('Unable to connect to authentication service. Continuing in demo mode.');
          }
        }

        // Set up auth state listener (non-blocking)
        try {
          const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            console.log('🔄 Auth state changed:', event, session?.user?.email);
            
            if (session?.user) {
              setUser(session.user);
              try {
                const { data: roleData } = await checkUserRole(session.user.id);
                setUserRole(roleData);
              } catch (roleError) {
                console.warn('⚠️ Role check failed on auth change:', roleError.message);
              }
            } else {
              setUser(null);
              setUserRole(null);
            }
          });

          // Store subscription for cleanup
          if (mounted) {
            return () => {
              try {
                data.subscription.unsubscribe();
              } catch (err) {
                console.warn('⚠️ Failed to unsubscribe from auth changes:', err.message);
              }
            };
          }
        } catch (err) {
          console.warn('⚠️ Failed to set up auth listener:', err.message);
        }

      } catch (err) {
        console.error('❌ Error during initialization:', err);
        if (mounted) {
          setAuthError('Initialization failed. Using demo mode.');
        }
      } finally {
        // Always stop loading after a reasonable time
        setTimeout(() => {
          if (mounted) {
            setLoadingProgress(100);
            setTimeout(() => {
              if (mounted) {
                setLoading(false);
              }
            }, 200);
          }
        }, 1000); // Minimum loading time
      }
    };

    checkUser();

    // Cleanup function
    return () => {
      mounted = false;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1 mb-6">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>

          {/* Loading Spinner */}
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-12 w-12 border-2 border-blue-200 mx-auto"></div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Microsoft Service Health Dashboard
          </h2>
          <p className="text-gray-600 mb-4">
            {loadingProgress < 30 && "Initializing application..."}
            {loadingProgress >= 30 && loadingProgress < 60 && "Checking authentication..."}
            {loadingProgress >= 60 && loadingProgress < 80 && "Loading user data..."}
            {loadingProgress >= 80 && "Almost ready..."}
          </p>

          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Connecting to services</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div 
                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" 
                style={{ animationDelay: '0.5s' }}
              ></div>
              <span>Loading dashboard components</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div 
                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" 
                style={{ animationDelay: '1s' }}
              ></div>
              <span>Preparing real-time monitoring</span>
            </div>
          </div>

          {/* Skip button after some time */}
          {loadingProgress > 50 && (
            <button
              onClick={() => setLoading(false)}
              className="mt-6 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Continue to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Show auth error if there is one, but don't block the app */}
        {authError && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Connection Notice:</strong> {authError}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  The app will work in demo mode. You can still browse service health data.
                </p>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="ml-auto text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                user={user} 
                onUserChange={setUser} 
                userRole={userRole} 
              />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <Dashboard 
                user={user} 
                onUserChange={setUser} 
                userRole={userRole} 
              />
            } 
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route 
            path="/admin" 
            element={
              user && userRole && userRole.role !== 'user' ? 
              <AdminPage /> : 
              <Navigate to="/dashboard" replace />
            } 
          />
          <Route path="/alert/:alertId" element={<AlertDetailPage />} />
          <Route path="/alert/:alertId/:tab" element={<AlertDetailPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;