import React,{useState,useEffect,useCallback} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Header from './Header';
import ServiceCard from './ServiceCard';
import AlertModal from './AlertModal';
import ResolvedAlertsSection from './ResolvedAlertsSection';
import MonitoringStatus from './MonitoringStatus';
import LoadingSpinner from './LoadingSpinner';
import {fetchServiceHealth,getMonitoringStatus,startRealTimeMonitoring} from '../services/microsoftApi';
import {formatDistanceToNow} from 'date-fns';

const {FiRefreshCw,FiAlertTriangle,FiDatabase,FiPlay,FiActivity}=FiIcons;

const Dashboard=({user,onUserChange})=> {
  const [services,setServices]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selectedAlert,setSelectedAlert]=useState(null);
  const [lastUpdated,setLastUpdated]=useState(null);
  const [error,setError]=useState(null);
  const [refreshing,setRefreshing]=useState(false);
  const [connectionStatus,setConnectionStatus]=useState('connecting');
  const [resolvedAlerts,setResolvedAlerts]=useState([]);
  const [monitoringStatus,setMonitoringStatus]=useState(null);

  const loadServiceHealth=useCallback(async ()=> {
    try {
      setRefreshing(true);
      setError(null);
      setConnectionStatus('connecting');
      console.log('🔄 Fetching service health data from database...');
      const startTime=Date.now();
      const data=await fetchServiceHealth();
      const fetchTime=Date.now() - startTime;
      console.log(`✅ Successfully fetched data in ${fetchTime}ms`);
      setServices(data.services);
      setResolvedAlerts(data.resolvedAlerts || []);
      setLastUpdated(data.lastUpdated);
      setMonitoringStatus(data.monitoringStatus);
      setConnectionStatus('connected');
      setError(null);
      // Log what we found
      const totalAlerts=data.services.reduce((sum,service)=> sum + service.alerts.length,0);
      console.log(`📊 Found ${totalAlerts} active alerts across ${data.services.length} services`);
      console.log(`📊 Found ${data.resolvedAlerts.length} resolved alerts`);
      if (data.monitoringStatus.status==='active') {
        console.log('✅ Real-time monitoring is active');
      } else {
        console.log('⚠️ Real-time monitoring is not active');
      }
    } catch (err) {
      console.error('❌ Failed to load service health:',err);
      setError(`Database connection failed: ${err.message}`);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },[]);

  const loadMonitoringStatus=useCallback(async ()=> {
    try {
      const status=await getMonitoringStatus();
      setMonitoringStatus(status);
    } catch (err) {
      console.error('Failed to get monitoring status:',err);
    }
  },[]);

  const handleStartMonitoring=useCallback(()=> {
    console.log('🚀 Starting real-time monitoring...');
    const status=startRealTimeMonitoring();
    setMonitoringStatus(prev=> ({
      ...prev,
      status: 'active',
      isActive: true,
      message: 'Real-time monitoring started - polling Microsoft services every 60 seconds'
    }));
    // Refresh data after starting monitoring
    setTimeout(()=> {
      loadServiceHealth();
    },2000);
  },[loadServiceHealth]);

  // Load initial data
  useEffect(()=> {
    const initializeDashboard=async ()=> {
      // Load initial data
      await loadServiceHealth();
      await loadMonitoringStatus();
    };
    initializeDashboard();
    // Auto-refresh every 30 seconds (data comes from database now)
    const dataInterval=setInterval(loadServiceHealth,30000);
    // Check monitoring status every 2 minutes
    const statusInterval=setInterval(loadMonitoringStatus,120000);
    return ()=> {
      clearInterval(dataInterval);
      clearInterval(statusInterval);
    };
  },[loadServiceHealth,loadMonitoringStatus]);

  // Calculate totals
  const totalAlerts=services.reduce((sum,service)=> sum + (service.alerts?.length || 0),0);
  const criticalAlerts=services.reduce(
    (sum,service)=> sum + (service.alerts?.filter(alert=> ['high','critical'].includes(alert.severity))?.length || 0),0
  );

  if (loading && services.length===0) {
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
          <MonitoringStatus
            status={monitoringStatus}
            className="mb-6"
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <SafeIcon icon={FiAlertTriangle} className="text-red-500 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Database Connection Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <p className="text-red-500 text-xs mt-2">
                  Please ensure your Supabase project is properly connected and the database tables exist.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Required Message */}
        {connectionStatus==='disconnected' && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiDatabase} className="text-blue-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Database Connection Required
            </h3>
            <p className="text-gray-600 mb-4">
              Please connect your Supabase project to view Microsoft service health data.
            </p>
            <div className="text-sm text-gray-500">
              <p>1. Connect your Supabase project in the settings</p>
              <p>2. Run the database schema to create the required tables</p>
              <p>3. Click "Start Monitoring" to begin real-time polling</p>
            </div>
          </div>
        )}

        {/* Monitoring Not Started Message */}
        {connectionStatus==='connected' && monitoringStatus && monitoringStatus.status !=='active' && (
          <div className="mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiPlay} className="text-yellow-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Start Real-Time Monitoring
            </h3>
            <p className="text-gray-600 mb-4">
              Click "Start Monitoring" to begin polling Microsoft services every 60 seconds for new alerts.
            </p>
            <button
              onClick={handleStartMonitoring}
              className="px-6 py-3 bg-microsoft-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <SafeIcon icon={FiPlay} />
              <span>Start Real-Time Monitoring</span>
            </button>
          </div>
        )}

        {/* Service Cards */}
        {connectionStatus==='connected' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map((service)=> (
              <ServiceCard
                key={service.id}
                service={service}
                onAlertClick={setSelectedAlert}
              />
            ))}
          </div>
        )}

        {/* All Clear Message */}
        {!loading && !error && totalAlerts===0 && connectionStatus==='connected' && monitoringStatus?.status==='active' && (
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
            <div className="text-xs text-green-600 mt-1">
              Real-time monitoring active • Checking every 60 seconds
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
      </main>

      {/* Alert Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <AlertModal
            alert={selectedAlert}
            onClose={()=> setSelectedAlert(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;