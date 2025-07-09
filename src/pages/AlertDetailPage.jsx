import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Header from '../components/Header';
import AlertModal from '../components/AlertModal';
import CommentSection from '../components/comments/CommentSection';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchServiceHealth } from '../services/microsoftApi';
import { getCurrentUser } from '../lib/supabase';

const { FiArrowLeft, FiAlertTriangle, FiInfo, FiCheckCircle } = FiIcons;

const AlertDetailPage = () => {
  const { alertId, tab } = useParams();
  const location = useLocation();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const isCommentsTab = tab === 'comments';

  useEffect(() => {
    loadAlert();
    checkUser();
  }, [alertId]);

  const checkUser = async () => {
    try {
      const { user, error } = await getCurrentUser();
      if (user) {
        setUser(user);
      }
    } catch (err) {
      console.error('Error checking user:', err);
    }
  };

  const loadAlert = async () => {
    setLoading(true);
    try {
      // Fetch all service health data and find the specific alert
      const data = await fetchServiceHealth();
      
      // Look for active alerts
      let foundAlert = null;
      for (const service of data.services) {
        const found = service.alerts.find(a => a.id === alertId);
        if (found) {
          foundAlert = { ...found, serviceName: service.name };
          break;
        }
      }
      
      // Look for resolved alerts if not found in active
      if (!foundAlert && data.resolvedAlerts) {
        foundAlert = data.resolvedAlerts.find(a => a.id === alertId);
      }
      
      if (foundAlert) {
        setAlert(foundAlert);
      } else {
        setError('Alert not found');
      }
    } catch (err) {
      console.error('Error loading alert:', err);
      setError('Failed to load alert details');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'high':
        return {
          icon: FiAlertTriangle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800'
        };
      case 'medium':
        return {
          icon: FiInfo,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'low':
        return {
          icon: FiInfo,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          icon: FiInfo,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'investigating':
        return { color: 'text-yellow-600', label: 'Investigating', icon: FiInfo };
      case 'monitoring':
        return { color: 'text-blue-600', label: 'Monitoring', icon: FiInfo };
      case 'resolved':
        return { color: 'text-green-600', label: 'Resolved', icon: FiCheckCircle };
      default:
        return { color: 'text-gray-600', label: 'Unknown', icon: FiInfo };
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !alert) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header user={user} />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiAlertTriangle} className="text-red-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {error || 'Alert Not Found'}
            </h3>
            <p className="text-gray-600 mb-6">
              We couldn't find the alert you're looking for. It may have been removed or resolved.
            </p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <SafeIcon icon={FiArrowLeft} />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const severityConfig = getSeverityConfig(alert.severity);
  const statusConfig = getStatusConfig(alert.status);
  const isResolved = alert.status === 'resolved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header 
        totalAlerts={0} 
        criticalAlerts={0} 
        lastUpdated={null} 
        onRefresh={() => {}}
        loading={false}
        user={user}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <SafeIcon icon={FiArrowLeft} className="text-gray-500" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className={`p-6 border-b border-gray-200 ${isResolved ? 'bg-green-50' : 'bg-white'}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${isResolved ? 'bg-green-100' : severityConfig.bg}`}>
                <SafeIcon 
                  icon={isResolved ? FiCheckCircle : severityConfig.icon} 
                  className={`text-2xl ${isResolved ? 'text-green-600' : severityConfig.color}`} 
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    {alert.title}
                  </h1>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${severityConfig.badge}`}>
                    {alert.severity.toUpperCase()} SEVERITY
                  </span>
                  <div className={`flex items-center gap-1 text-sm font-medium ${statusConfig.color}`}>
                    <SafeIcon icon={statusConfig.icon} className="text-sm" />
                    {statusConfig.label}
                  </div>
                  {alert.serviceName && (
                    <span className="text-sm text-gray-600">
                      Service: {alert.serviceName}
                    </span>
                  )}
                </div>
                
                <div className="text-gray-700 mb-4">
                  {alert.impact}
                </div>
                
                <div className="flex gap-4">
                  <Link 
                    to={`/alert/${alertId}`}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      !isCommentsTab 
                        ? 'bg-gray-100 font-medium text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Details
                  </Link>
                  <Link 
                    to={`/alert/${alertId}/comments`}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      isCommentsTab 
                        ? 'bg-gray-100 font-medium text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Comments
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isCommentsTab ? (
          <CommentSection alert={alert} user={user} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Alert Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alert details content - similar to modal but formatted for a page */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Impact Description</h4>
                  <p className="text-gray-700">{alert.impact}</p>
                </div>
                
                {alert.region && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Affected Region</h4>
                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm">
                      {alert.region}
                    </span>
                  </div>
                )}
                
                {isResolved && alert.resolutionSummary && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">
                      Resolution Summary
                    </h4>
                    <p className="text-sm text-green-800">
                      {alert.resolutionSummary}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {alert.affectedServices && alert.affectedServices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Affected Services</h4>
                    <div className="space-y-2">
                      {alert.affectedServices.map((service, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                        >
                          <div className={`w-2 h-2 rounded-full ${isResolved ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-sm text-gray-700">{service}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Link 
                    to={`/alert/${alertId}/comments`}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors w-full justify-center"
                  >
                    <SafeIcon icon={FiInfo} />
                    <span>View Discussion</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <AlertModal
          alert={alert}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AlertDetailPage;