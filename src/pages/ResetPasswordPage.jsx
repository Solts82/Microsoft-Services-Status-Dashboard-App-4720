import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { updatePassword, verifyPasswordResetToken } from '../lib/supabase';

const { FiKey, FiLock, FiAlertCircle, FiCheckCircle, FiLoader } = FiIcons;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type') || 'recovery';

        if (!token) {
          setStatus('error');
          setError('Invalid reset link. Please request a new password reset.');
          return;
        }

        console.log('Verifying password reset token...');
        
        // Verify the reset token
        const { data, error } = await verifyPasswordResetToken(token, type);

        if (error) {
          throw error;
        }

        setTokenValid(true);
        setStatus('ready');
        console.log('Token verified successfully');

      } catch (error) {
        console.error('Token verification failed:', error);
        setStatus('error');
        setError(error.message || 'Invalid or expired reset link. Please request a new password reset.');
      }
    };

    verifyToken();
  }, [searchParams]);

  const validatePassword = () => {
    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    if (!tokenValid) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Updating password...');
      
      const { error } = await updatePassword(password);

      if (error) {
        throw error;
      }

      setSuccess('Password updated successfully! Redirecting to dashboard...');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Password update failed:', error);
      setError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: FiLoader,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          title: 'Verifying Reset Link...'
        };
      case 'ready':
        return {
          icon: FiKey,
          color: 'text-green-600',
          bg: 'bg-green-50',
          title: 'Reset Your Password'
        };
      case 'error':
        return {
          icon: FiAlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          title: 'Reset Link Invalid'
        };
      default:
        return {
          icon: FiLoader,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          title: 'Processing...'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 ${config.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center`}>
              <SafeIcon 
                icon={config.icon} 
                className={`text-2xl ${config.color} ${status === 'loading' ? 'animate-spin' : ''}`} 
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {config.title}
              </h2>
              <p className="text-sm text-gray-600">
                Microsoft Service Health Dashboard
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {status === 'loading' && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Please wait while we verify your password reset link...
              </p>
              <div className="animate-pulse text-sm text-gray-500">
                This may take a few seconds...
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full px-4 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Need to reset your password again? Sign in and use "Forgot Password"
              </p>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <SafeIcon icon={FiAlertCircle} className="flex-shrink-0 text-red-500" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                  <SafeIcon icon={FiCheckCircle} className="flex-shrink-0 text-green-500" />
                  <p className="text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SafeIcon icon={FiLock} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                    placeholder="Enter new password"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SafeIcon icon={FiLock} className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                    placeholder="Confirm new password"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !tokenValid}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-microsoft-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-microsoft-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating Password...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="text-sm text-microsoft-blue hover:text-blue-700 font-medium"
                >
                  Cancel and return to dashboard
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;