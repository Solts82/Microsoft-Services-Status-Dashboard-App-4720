import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ServiceCard from './ServiceCard';
import ResolvedAlertsSection from './ResolvedAlertsSection';
import AlertModal from './AlertModal';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import { fetchServiceHealth } from '../services/microsoftApi';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiMessageSquare, FiArrowRight, FiAlertTriangle } = FiIcons;

const Dashboard = ({ user, onUserChange }) => {
  const [services, setServices] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Memoize the fetch function to avoid unnecessary re-renders
  const loadServiceHealth = useCallback(async (isUserInitiated = false) => {
    try {
      if (isUserInitiated) {
        setRefreshing(true);
      }
      setError(null);
      
      console.log('Fetching Microsoft service health data...');
      
      const data = await fetchServiceHealth();
      
      // Log the results to help with debugging
      console.log(`Received data: ${data.services.length} services, ${data.resolvedAlerts.length} resolved alerts`);
      
      let alertCount = 0;
      data.services.forEach(service => {
        alertCount += service.alerts?.length || 0;
        console.log(`${service.name}: ${service.status}, ${service.alerts?.length || 0} alerts`);
      });
      
      console.log(`Total active alerts: ${alertCount}`);
      
      setServices(data.services || []);
      setResolvedAlerts(data.resolvedAlerts || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading service health data:', err);
      setError('Failed to load service health data. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadServiceHealth();
    
    // Set up refresh timer (every 2 minutes instead of 5 for more frequent updates)
    const interval = setInterval(() => {
      console.log('Auto-refreshing service health data...');
      loadServiceHealth();
    }, 120000);
    
    return () => clearInterval(interval);
  }, [loadServiceHealth]);

  // Manual refresh handler
  const handleRefresh = () => {
    loadServiceHealth(true);
  };

  const totalAlerts = services.reduce((sum, service) => sum + (service.alerts?.length || 0), 0);
  const criticalAlerts = services.reduce(
    (sum, service) => sum + (service.alerts?.filter(alert => alert.severity === 'high')?.length || 0),
    0
  );

  // Get all alerts for the comments showcase
  const allAlerts = services.flatMap(service => 
    (service.alerts || []).map(alert => ({
      ...alert,
      serviceName: service.name
    }))
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header 
        totalAlerts={totalAlerts} 
        criticalAlerts={criticalAlerts} 
        lastUpdated={lastUpdated} 
        onRefresh={handleRefresh} 
        loading={refreshing}
        user={user}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <SafeIcon icon={FiAlertTriangle} className="text-yellow-600" />
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        </motion.div>
      )}

      <main className="container mx-auto px-4 pb-8 space-y-8">
        {/* Comments Feature Showcase */}
        {allAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiMessageSquare} className="text-indigo-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    💬 Comments & Discussions
                  </h3>
                  <p className="text-sm text-gray-600">
                    Join the conversation about service alerts and share your experiences
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allAlerts.slice(0, 2).map((alert) => (
                <div key={alert.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2 line-clamp-1">
                    {alert.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {alert.impact}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {alert.serviceName}
                    </span>
                    <Link
                      to={`/alert/${alert.id}/comments`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                    >
                      <SafeIcon icon={FiMessageSquare} className="text-sm" />
                      <span>View Comments</span>
                      <SafeIcon icon={FiArrowRight} className="text-xs" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Service Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ServiceCard service={service} onAlertClick={setSelectedAlert} />
            </motion.div>
          ))}
        </motion.div>

        {/* Resolved Alerts Section */}
        <ResolvedAlertsSection resolvedAlerts={resolvedAlerts} onAlertClick={setSelectedAlert} />

        {/* All Systems Operational Message */}
        {totalAlerts === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                All Systems Operational
              </h3>
              <p className="text-gray-600">
                No service alerts detected. All Microsoft services are running smoothly.
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-2">
                  Last checked {formatDistanceToNow(lastUpdated)} ago
                </p>
              )}
            </div>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {selectedAlert && (
          <AlertModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;