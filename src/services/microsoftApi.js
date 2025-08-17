import { getActiveAlerts, getResolvedAlerts, getLastMonitoringRun } from '../lib/supabase.js';
import { realTimeMonitoring } from './realTimeMonitoring.js';

// This service fetches data from our Supabase database and manages real-time monitoring
export const fetchServiceHealth = async () => {
  console.log('🔄 Fetching service health data from database...');
  
  try {
    const startTime = Date.now();
    
    // Start real-time monitoring if not already running
    if (!realTimeMonitoring.getStatus().isRunning) {
      console.log('🚀 Starting real-time monitoring...');
      realTimeMonitoring.start();
    }
    
    console.log('📡 Fetching from Supabase database...');
    
    // Fetch data from database
    const [activeAlertsResult, resolvedAlertsResult, lastRunResult] = await Promise.allSettled([
      getActiveAlerts(),
      getResolvedAlerts(30), // Last 30 days
      getLastMonitoringRun()
    ]);
    
    const activeAlerts = activeAlertsResult.status === 'fulfilled' ? activeAlertsResult.value.data || [] : [];
    const resolvedAlerts = resolvedAlertsResult.status === 'fulfilled' ? resolvedAlertsResult.value.data || [] : [];
    const lastRun = lastRunResult.status === 'fulfilled' ? lastRunResult.value.data : null;
    
    // Group alerts by service
    const services = [
      {
        id: 'azure',
        name: 'Microsoft Azure',
        alerts: activeAlerts.filter(alert => alert.service_name === 'azure').map(transformAlert),
        status: getServiceStatus(activeAlerts.filter(alert => alert.service_name === 'azure')),
        lastChecked: lastRun?.run_at ? new Date(lastRun.run_at) : new Date()
      },
      {
        id: 'microsoft365',
        name: 'Microsoft 365',
        alerts: activeAlerts.filter(alert => alert.service_name === 'microsoft365').map(transformAlert),
        status: getServiceStatus(activeAlerts.filter(alert => alert.service_name === 'microsoft365')),
        lastChecked: lastRun?.run_at ? new Date(lastRun.run_at) : new Date()
      },
      {
        id: 'entra',
        name: 'Microsoft Entra ID',
        alerts: activeAlerts.filter(alert => alert.service_name === 'entra').map(transformAlert),
        status: getServiceStatus(activeAlerts.filter(alert => alert.service_name === 'entra')),
        lastChecked: lastRun?.run_at ? new Date(lastRun.run_at) : new Date()
      },
      {
        id: 'github',
        name: 'GitHub (Microsoft)',
        alerts: activeAlerts.filter(alert => alert.service_name === 'github').map(transformAlert),
        status: getServiceStatus(activeAlerts.filter(alert => alert.service_name === 'github')),
        lastChecked: lastRun?.run_at ? new Date(lastRun.run_at) : new Date()
      }
    ];
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ Fetched data in ${fetchTime}ms`);
    
    const totalActiveAlerts = activeAlerts.length;
    const totalResolvedAlerts = resolvedAlerts.length;
    
    console.log(`📊 Found ${totalActiveAlerts} active alerts and ${totalResolvedAlerts} resolved alerts`);
    
    // Get monitoring status
    const monitoringStatus = realTimeMonitoring.getStatus();
    
    return {
      services,
      resolvedAlerts: resolvedAlerts.map(transformAlert),
      lastUpdated: lastRun?.run_at ? new Date(lastRun.run_at) : new Date(),
      monitoringStatus: {
        status: monitoringStatus.isRunning ? 'active' : 'inactive',
        isActive: monitoringStatus.isRunning,
        lastRun: monitoringStatus.lastRun,
        nextRun: monitoringStatus.nextRun,
        message: monitoringStatus.isRunning 
          ? 'Real-time monitoring active (60-second intervals)' 
          : 'Real-time monitoring stopped',
        intervalSeconds: 60,
        consecutiveErrors: monitoringStatus.consecutiveErrors,
        lastRunStats: lastRun ? {
          duration: lastRun.duration_ms,
          alertsFound: lastRun.alerts_found,
          alertsUpdated: lastRun.alerts_updated,
          alertsResolved: lastRun.alerts_resolved,
          errors: lastRun.errors || [],
          status: lastRun.status
        } : null
      }
    };
    
  } catch (error) {
    console.error('❌ Error fetching service health:', error);
    throw error;
  }
};

// Transform database alert to frontend format
function transformAlert(dbAlert) {
  return {
    id: dbAlert.external_id,
    title: dbAlert.title,
    severity: dbAlert.severity,
    status: dbAlert.status,
    impact: dbAlert.impact,
    startTime: new Date(dbAlert.start_time),
    lastUpdated: new Date(dbAlert.updated_at || dbAlert.created_at),
    resolvedTime: dbAlert.resolved_at ? new Date(dbAlert.resolved_at) : null,
    region: dbAlert.region,
    affectedServices: Array.isArray(dbAlert.affected_services) ? dbAlert.affected_services : [],
    source: dbAlert.source_api,
    resolutionSummary: dbAlert.resolution_summary,
    // Include database fields for reference
    externalId: dbAlert.external_id,
    serviceName: dbAlert.service_name,
    rawData: dbAlert.raw_data
  };
}

// Determine service status based on alerts
function getServiceStatus(alerts) {
  if (!alerts || alerts.length === 0) return 'operational';
  
  const hasHighSeverity = alerts.some(alert => ['high', 'critical'].includes(alert.severity));
  const hasMediumSeverity = alerts.some(alert => alert.severity === 'medium');
  
  if (hasHighSeverity) return 'outage';
  if (hasMediumSeverity) return 'degraded';
  return 'operational';
}

// Get monitoring service status
export const getMonitoringStatus = async () => {
  try {
    const monitoringStatus = realTimeMonitoring.getStatus();
    const { data: lastRun } = await getLastMonitoringRun();
    
    if (!lastRun && !monitoringStatus.isRunning) {
      return {
        status: 'inactive',
        message: 'Real-time monitoring not started. Click refresh to begin monitoring.',
        lastRun: null
      };
    }
    
    const timeSinceLastRun = lastRun ? Date.now() - new Date(lastRun.run_at).getTime() : null;
    const isActive = monitoringStatus.isRunning;
    
    return {
      status: isActive ? 'active' : 'inactive',
      message: isActive 
        ? 'Real-time monitoring active - polling Microsoft services every 60 seconds'
        : 'Real-time monitoring stopped',
      lastRun: lastRun ? new Date(lastRun.run_at) : monitoringStatus.lastRun,
      timeSinceLastRun,
      intervalSeconds: 60,
      consecutiveErrors: monitoringStatus.consecutiveErrors,
      lastRunStats: lastRun ? {
        duration: lastRun.duration_ms,
        alertsFound: lastRun.alerts_found,
        alertsUpdated: lastRun.alerts_updated,
        alertsResolved: lastRun.alerts_resolved,
        errors: lastRun.errors || [],
        status: lastRun.status
      } : null
    };
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    return {
      status: 'error',
      message: `Failed to get monitoring status: ${error.message}`,
      lastRun: null
    };
  }
};

// Start real-time monitoring
export const startRealTimeMonitoring = () => {
  realTimeMonitoring.start();
  return realTimeMonitoring.getStatus();
};

// Stop real-time monitoring
export const stopRealTimeMonitoring = () => {
  realTimeMonitoring.stop();
  return realTimeMonitoring.getStatus();
};

// Search alerts in database
export const searchServiceAlerts = async (searchTerm, startDate = null, endDate = null, limit = 100) => {
  try {
    const { searchAlerts } = await import('../lib/supabase.js');
    const { data, error } = await searchAlerts(searchTerm, startDate, endDate);
    
    if (error) throw error;
    
    return {
      alerts: data?.map(transformAlert) || [],
      total: data?.length || 0
    };
  } catch (error) {
    console.error('Error searching alerts:', error);
    throw new Error(`Failed to search alerts: ${error.message}`);
  }
};