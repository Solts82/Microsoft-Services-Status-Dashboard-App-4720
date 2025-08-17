import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { signIn, signUp, resetPassword } from '../../lib/supabase';

const { FiX, FiUserPlus, FiLogIn, FiMail, FiLock, FiAlertCircle, FiCheckCircle, FiKey } = FiIcons;

const AuthModal = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const toggleMode = () => {
    if (mode === 'forgot') {
      setMode('login');
    } else {
      setMode(mode === 'login' ? 'register' : 'login');
    }
    setError(null);
    setSuccess(null);
  };

  const showForgotPassword = () => {
    setMode('forgot');
    setError(null);
    setSuccess(null);
  };

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (mode === 'forgot') {
      return true; // Only email required for password reset
    }

    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'login') {
        const { data, error } = await signIn(email, password);
        if (error) throw error;

        setSuccess('Logged in successfully! Redirecting...');
        setTimeout(() => {
          onClose();
          navigate('/dashboard');
        }, 1000);
      } else if (mode === 'register') {
        const { data, error } = await signUp(email, password);
        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.user.email_confirmed_at) {
          setSuccess('Registration successful! Please check your email to confirm your account.');
          setTimeout(() => {
            onClose();
          }, 3000);
        } else {
          // User is automatically confirmed (email confirmation disabled)
          setSuccess('Registration successful! Redirecting to your profile...');
          setTimeout(() => {
            onClose();
            navigate('/profile');
          }, 1500);
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) throw error;

        setSuccess('Password reset email sent! Check your inbox for instructions.');
        setTimeout(() => {
          setMode('login');
          setSuccess(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      
      // Handle specific Supabase errors
      if (err.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.');
      } else if (err.message.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.message.includes('User not found')) {
        setError('No account found with this email address.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getModalConfig = () => {
    switch (mode) {
      case 'register':
        return {
          icon: FiUserPlus,
          title: 'Create Account',
          submitText: 'Create Account'
        };
      case 'forgot':
        return {
          icon: FiKey,
          title: 'Reset Password',
          submitText: 'Send Reset Email'
        };
      default:
        return {
          icon: FiLogIn,
          title: 'Sign In',
          submitText: 'Sign In'
        };
    }
  };

  const config = getModalConfig();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-microsoft-blue/10 rounded-full">
                  <SafeIcon 
                    icon={config.icon} 
                    className="text-xl text-microsoft-blue" 
                  />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {config.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <SafeIcon icon={FiX} className="text-xl text-gray-500" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6">
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SafeIcon icon={FiMail} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-microsoft-blue focus:border-microsoft-blue"
                      placeholder="you@example.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
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
                        placeholder="••••••••"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                      Confirm Password
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
                        placeholder="••••••••"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {mode === 'forgot' && (
                  <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <p className="mb-1">🔑 <strong>Password Reset:</strong></p>
                    <p>We'll send a password reset link to your email address.</p>
                    <p className="mt-1">The email will come from <strong>no-reply@microsoftservicealert.com</strong></p>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <p className="mb-1">📧 <strong>Email Setup:</strong></p>
                    <p>Confirmation emails will be sent from <strong>no-reply@microsoftservicealert.com</strong></p>
                    <p className="mt-1">Please check your inbox and spam folder for the confirmation link.</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-microsoft-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-microsoft-blue disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {mode === 'login' ? 'Signing In...' : mode === 'register' ? 'Creating Account...' : 'Sending Email...'}
                    </span>
                  ) : (
                    config.submitText
                  )}
                </button>
              </form>

              <div className="mt-4 text-center space-y-2">
                {mode === 'login' && (
                  <button
                    onClick={showForgotPassword}
                    className="text-sm text-microsoft-blue hover:text-blue-700 font-medium block w-full"
                  >
                    Forgot your password?
                  </button>
                )}

                <button
                  onClick={toggleMode}
                  className="text-sm text-microsoft-blue hover:text-blue-700 font-medium"
                >
                  {mode === 'login' 
                    ? "Don't have an account? Sign up"
                    : mode === 'register'
                    ? "Already have an account? Sign in"
                    : "Back to sign in"
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;