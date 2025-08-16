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
import { monitoringWorker } from '../services/monitoringWorker';
import { formatDistanceToNow } from 'date-fns';

const { FiRefreshCw, FiAlertTriangle, FiWifi, FiWifiOff, FiActivity } = FiIcons;

const Dashboard = ({ user, onUserChange }) => {
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
      
      console.log('🔄 Fetching service health data from database...');
      const startTime = Date.now();
      
      const data = await fetchServiceHealth();
      
      const fetchTime = Date.now() - startTime;
      console.log(`✅ Successfully fetched data in ${fetchTime}ms`);
      
      setServices(data.services);
      setResolvedAlerts(data.resolvedAlerts || []);
      setLastUpdated(data.lastUpdated);
      setMonitoringStatus(data.monitoringStatus);
      setConnectionStatus('connected');
      setError(null);
      
      // Log what we found
      const totalAlerts = data.services.reduce((sum, service) => sum + service.alerts.length, 0);
      console.log(`📊 Found ${totalAlerts} active alerts across ${data.services.length} services`);
      console.log(`📊 Found ${data.resolvedAlerts.length} resolved alerts`);
      
    } catch (err) {
      console.error('❌ Failed to load service health:', err);
      setError(`Failed to fetch service health data: ${err.message}`);
      setConnectionStatus('disconnected');
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

  // Load initial data and start background monitoring
  useEffect(() => {
    const initializeDashboard = async () => {
      // Start background monitoring service
      try {
        await monitoringWorker.start();
        console.log('✅ Background monitoring initialized');
      } catch (err) {
        console.warn('⚠️ Background monitoring failed to start:', err);
      }
      
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
      // Don't stop monitoring worker on unmount - let it run in background
    };
  }, [loadServiceHealth, loadMonitoringStatus]);

  // Calculate totals
  const totalAlerts = services.reduce((sum, service) => sum + (service.alerts?.length || 0), 0);
  const criticalAlerts = services.reduce(
    (sum, service) => sum + (service.alerts?.filter(alert => ['high', 'critical'].includes(alert.severity))?.length || 0),
    0
  );

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-blue-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return FiWifi;
      case 'connecting': return FiRefreshCw;
      case 'disconnected': return FiWifiOff;
      default: return FiWifi;
    }
  };

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
      />

      <main className="container mx-auto px-4 py-8">
        {/* Monitoring Status */}
        {monitoringStatus && (
          <MonitoringStatus status={monitoringStatus} className="mb-6" />
        )}

        {/* Live Status Bar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <SafeIcon 
                  icon={getConnectionStatusIcon()} 
                  className={`${connectionStatus === 'connecting' ? 'animate-spin' : ''} ${getConnectionStatusColor()}`} 
                />
                <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
                  {connectionStatus === 'connected' && 'Database Connected'}
                  {connectionStatus === 'connecting' && 'Loading Data...'}
                  {connectionStatus === 'disconnected' && 'Connection Failed'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {lastUpdated ? `Updated ${formatDistanceToNow(lastUpdated)} ago` : 'Loading...'}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">
                Auto-refresh: 30sec
              </div>
              <button
                onClick={loadServiceHealth}
                disabled={refreshing}
                className="px-4 py-2 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <SafeIcon icon={FiRefreshCw} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh Now'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <SafeIcon icon={FiAlertTriangle} className="text-red-500 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Database Connection Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <p className="text-red-500 text-xs mt-2">
                  The monitoring system continuously checks Microsoft services and stores data in the database.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Source Info */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <SafeIcon icon={FiActivity} className="text-blue-600" />
            <span className="text-sm font-medium">Data Source:</span>
            <span className="text-xs">
              Continuous monitoring system • Database-stored alerts • Real-time updates every minute
            </span>
          </div>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onAlertClick={setSelectedAlert}
            />
          ))}
        </div>

        {/* All Clear Message */}
        {!loading && !error && totalAlerts === 0 && connectionStatus === 'connected' && (
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
              Last monitored: {lastUpdated ? formatDistanceToNow(lastUpdated) : 'Just now'} ago
            </div>
          </div>
        )}

        {/* Resolved Alerts Section */}
        {resolvedAlerts && resolvedAlerts.length > 0 && (
          <div className="mt-8">
            <ResolvedAlertsSection 
              resolvedAlerts={resolvedAlerts}
              onAlertClick={setSelectedAlert}
            />
          </div>
        )}

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-800 mb-2">Debug Information</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Services loaded: {services.length}</div>
              <div>Total alerts: {totalAlerts}</div>
              <div>Critical alerts: {criticalAlerts}</div>
              <div>Resolved alerts: {resolvedAlerts.length}</div>
              <div>Connection status: {connectionStatus}</div>
              <div>Last update: {lastUpdated?.toISOString()}</div>
              <div>Monitoring active: {monitoringStatus?.isActive ? 'Yes' : 'No'}</div>
              <div>Last monitoring run: {monitoringStatus?.lastRun?.toISOString()}</div>
            </div>
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