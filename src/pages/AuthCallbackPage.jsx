import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { confirmEmail } from '../lib/supabase';

const { FiCheckCircle, FiAlertCircle, FiLoader, FiKey } = FiIcons;

const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get parameters from URL
        const token = searchParams.get('token');
        const type = searchParams.get('type') || 'signup';

        if (!token) {
          setStatus('error');
          setMessage('Invalid confirmation link. Please try again.');
          return;
        }

        console.log('Processing auth callback...', { type });

        // Handle different callback types
        if (type === 'recovery') {
          // This is a password reset callback - redirect to reset password page
          setStatus('redirect');
          setMessage('Redirecting to password reset...');
          
          // Redirect to reset password page with the token
          setTimeout(() => {
            navigate(`/auth/reset-password?token=${token}&type=${type}`);
          }, 1000);
          
          return;
        }

        // Handle email confirmation
        const { data, error } = await confirmEmail(token, type);

        if (error) {
          throw error;
        }

        setStatus('success');
        setMessage('Email confirmed successfully! Redirecting to your dashboard...');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);

      } catch (error) {
        console.error('Auth callback failed:', error);
        setStatus('error');
        setMessage(error.message || 'Authentication failed. Please try again.');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: FiLoader,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          title: 'Processing...'
        };
      case 'success':
        return {
          icon: FiCheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          title: 'Success!'
        };
      case 'redirect':
        return {
          icon: FiKey,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          title: 'Redirecting...'
        };
      case 'error':
        return {
          icon: FiAlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          title: 'Error'
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
        className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center"
      >
        <div className={`w-20 h-20 ${config.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <SafeIcon 
            icon={config.icon} 
            className={`text-3xl ${config.color} ${(status === 'loading' || status === 'redirect') ? 'animate-spin' : ''}`} 
          />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {config.title}
        </h2>

        <p className="text-gray-600 mb-6">
          {message || 'Please wait while we process your request...'}
        </p>

        {status === 'error' && (
          <div className="space-y-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-4 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <p className="text-sm text-gray-500">
              If you continue to have issues, please contact support.
            </p>
          </div>
        )}

        {(status === 'loading' || status === 'redirect') && (
          <div className="flex justify-center">
            <div className="animate-pulse text-sm text-gray-500">
              This may take a few seconds...
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallbackPage;