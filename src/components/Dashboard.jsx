import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Header from './Header';
import ServiceCard from './ServiceCard';
import AlertModal from './AlertModal';
import ResolvedAlertsSection from './ResolvedAlertsSection';
import MonitoringStatus from './MonitoringStatus';
import LoadingSpinner from './LoadingSpinner';
import { fetchServiceHealth, getMonitoringStatus } from '../services/microsoftApi';
import { formatDistanceToNow } from 'date-fns';

const { FiRefreshCw, FiAlertTriangle, FiDatabase, FiPlay, FiActivity, FiWifi, FiWifiOff } = FiIcons;

const Dashboard = ({ user, onUserChange, userRole }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [monitoringStatus, setMonitoringStatus] = useState(null);

  const loadServiceHealth = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      setConnectionStatus('connecting');
      
      console.log('🔄 Fetching live service health data...');
      const startTime = Date.now();
      
      const data = await fetchServiceHealth();
      const fetchTime = Date.now() - startTime;
      
      console.log(`✅ Successfully loaded live data in ${fetchTime}ms`);
      
      setServices(data.services);
      setResolvedAlerts(data.resolvedAlerts || []);
      setLastUpdated(data.lastUpdated);
      setMonitoringStatus(data.monitoringStatus);
      setConnectionStatus('connected');
      setError(null);

      // Log what we found
      const totalAlerts = data.services.reduce((sum, service) => sum + service.alerts.length, 0);
      console.log(`📊 Found ${totalAlerts} active alerts across ${data.services.length} services`);
      console.log(`📊 Found ${data.resolvedAlerts?.length || 0} resolved alerts`);
      
      if (data.monitoringStatus.status === 'active') {
        console.log('✅ Real-time monitoring is active');
      } else if (data.monitoringStatus.status === 'inactive') {
        console.log('⚠️ Real-time monitoring is inactive');
      } else {
        console.log('📝 No monitoring runs found in database');
      }

    } catch (err) {
      console.error('❌ Failed to load service health:', err);
      setError(`Database connection failed: ${err.message}`);
      setConnectionStatus('error');
      
      // Set empty state instead of mock data
      setServices([]);
      setResolvedAlerts([]);
      setMonitoringStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMonitoringStatus = useCallback(async () => {
    try {
      const status = await getMonitoringStatus();
      setMonitoringStatus(status);
    } catch (err) {
      console.error('Failed to get monitoring status:', err);
    }
  }, []);

  const handleMonitoringStatusChange = useCallback(() => {
    // Refresh both monitoring status and service health data
    setTimeout(() => {
      loadMonitoringStatus();
      loadServiceHealth();
    }, 1000);
  }, [loadMonitoringStatus, loadServiceHealth]);

  // Load initial data
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log('🚀 Initializing Microsoft Service Health Dashboard...');
      
      // Load initial data
      await loadServiceHealth();
      await loadMonitoringStatus();
    };

    initializeDashboard();

    // Auto-refresh every 30 seconds (data comes from database now)
    const dataInterval = setInterval(loadServiceHealth, 30000);
    
    // Check monitoring status every 2 minutes
    const statusInterval = setInterval(loadMonitoringStatus, 120000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(statusInterval);
    };
  }, [loadServiceHealth, loadMonitoringStatus]);

  // Calculate totals
  const totalAlerts = services.reduce((sum, service) => sum + (service.alerts?.length || 0), 0);
  const criticalAlerts = services.reduce(
    (sum, service) => sum + (service.alerts?.filter(alert => ['high', 'critical'].includes(alert.severity))?.length || 0),
    0
  );

  if (loading && services.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header
        totalAlerts={totalAlerts}
        criticalAlerts={criticalAlerts}
        lastUpdated={lastUpdated}
        onRefresh={loadServiceHealth}
        loading={refreshing}
        user={user}
        userRole={userRole}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Monitoring Status */}
        {monitoringStatus && (
          <MonitoringStatus
            status={monitoringStatus}
            className="mb-6"
            onStatusChange={handleMonitoringStatusChange}
          />
        )}

        {/* Database Connection Error */}
        {connectionStatus === 'error' && (
          <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <SafeIcon icon={FiWifiOff} className="text-red-500 mt-0.5 text-xl" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Database Connection Failed
                </h3>
                <p className="text-red-700 mb-3">{error}</p>
                <div className="text-sm text-red-600 space-y-1">
                  <p>• Verify your internet connection</p>
                  <p>• Check Supabase project configuration in src/lib/supabase.js</p>
                  <p>• Ensure database tables are set up correctly</p>
                  <p>• Contact support if the issue persists</p>
                </div>
                <button
                  onClick={loadServiceHealth}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <SafeIcon icon={FiRefreshCw} className={refreshing ? 'animate-spin' : ''} />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Monitoring Runs Found */}
        {connectionStatus === 'connected' && (monitoringStatus?.status === 'never_run' || monitoringStatus?.status === 'stopped') && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiPlay} className="text-blue-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {monitoringStatus?.status === 'never_run' ? 'No Monitoring Data Found' : 'Monitoring Stopped'}
            </h3>
            <p className="text-gray-600 mb-4">
              {monitoringStatus?.status === 'never_run' ? 
                'No monitoring runs found in the database. Start the monitoring service to begin collecting live Microsoft service health data.' :
                'The monitoring service has been stopped. Start it again to continue collecting service health data.'
              }
            </p>
            <div className="text-sm text-gray-500 mb-4">
              <p>ℹ️ This will simulate real-time monitoring of Microsoft services</p>
              <p>🔄 Service checks run every 60 seconds when active</p>
              <p>📊 Data is stored permanently in your Supabase database</p>
            </div>
          </div>
        )}

        {/* Monitoring Inactive */}
        {connectionStatus === 'connected' && monitoringStatus && 
         monitoringStatus.status === 'inactive' && monitoringStatus.lastRun && (
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiActivity} className="text-yellow-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Monitoring Service Inactive
            </h3>
            <p className="text-gray-600 mb-2">
              The monitoring service hasn't run recently. Last run: {formatDistanceToNow(monitoringStatus.lastRun)} ago
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Data shown is from the last successful monitoring run.
            </p>
          </div>
        )}

        {/* Connected Status */}
        {connectionStatus === 'connected' && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <SafeIcon icon={FiWifi} className="text-green-600" />
              <span className="text-sm font-medium">Connected to live database</span>
              {lastUpdated && (
                <span className="text-xs text-green-600">
                  • Last updated {formatDistanceToNow(lastUpdated)} ago
                </span>
              )}
            </div>
          </div>
        )}

        {/* Service Cards */}
        {connectionStatus === 'connected' && services.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onAlertClick={setSelectedAlert}
              />
            ))}
          </div>
        )}

        {/* No Data State */}
        {connectionStatus === 'connected' && services.length > 0 && totalAlerts === 0 && (
          <div className="text-center mt-8 p-8 bg-white rounded-lg border border-gray-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              All Systems Operational
            </h3>
            <p className="text-gray-600 mb-2">
              No active incidents or service issues detected across Microsoft services.
            </p>
            <div className="text-xs text-gray-500">
              Last monitored: {lastUpdated ? formatDistanceToNow(lastUpdated) : 'Never'} ago
            </div>
            {monitoringStatus?.status === 'active' && (
              <div className="text-xs text-green-600 mt-1">
                Real-time monitoring active • Checking every 60 seconds
              </div>
            )}
          </div>
        )}

        {/* Empty State - No Services */}
        {connectionStatus === 'connected' && services.length === 0 && (
          <div className="text-center mt-8 p-8 bg-white rounded-lg border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiDatabase} className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Service Data Available
            </h3>
            <p className="text-gray-600 mb-4">
              No service health data found in the database. This could mean:
            </p>
            <div className="text-sm text-gray-500 space-y-1 mb-4">
              <p>• The monitoring service hasn't run yet</p>
              <p>• No alerts have been detected</p>
              <p>• Database tables may need to be initialized</p>
            </div>
            <button
              onClick={loadServiceHealth}
              className="px-4 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <SafeIcon icon={FiRefreshCw} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh Data</span>
            </button>
          </div>
        )}

        {/* Resolved Alerts Section */}
        {connectionStatus === 'connected' && resolvedAlerts && resolvedAlerts.length > 0 && (
          <div className="mt-8">
            <ResolvedAlertsSection
              resolvedAlerts={resolvedAlerts}
              onAlertClick={setSelectedAlert}
            />
          </div>
        )}
      </main>

      {/* Alert Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <AlertModal
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;