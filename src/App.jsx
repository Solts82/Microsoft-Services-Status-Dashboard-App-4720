import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AlertDetailPage from './pages/AlertDetailPage';
import { getCurrentUser } from './lib/supabase';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('Checking user auth state...');
        const { user, error } = await getCurrentUser();
        if (user) {
          setUser(user);
          console.log('✅ User authenticated:', user.email);
        } else {
          console.log('ℹ️ No user authenticated');
        }
      } catch (err) {
        console.error('Error checking user:', err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Microsoft Service Health Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Routes>
          <Route path="/" element={<Dashboard user={user} onUserChange={setUser} />} />
          <Route path="/alert/:alertId" element={<AlertDetailPage />} />
          <Route path="/alert/:alertId/:tab" element={<AlertDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;