import { getActiveAlerts, getResolvedAlerts, getLastMonitoringRun } from '../lib/supabase.js';
import { realTimeMonitoring } from './realTimeMonitoring.js';

// This service fetches ONLY live data from Supabase database - NO MOCK DATA
export const fetchServiceHealth = async () => {
  console.log('🔄 Fetching live service health data from database...');
  
  try {
    const startTime = Date.now();
    console.log('📡 Connecting to production Supabase database...');

    // Fetch live data from database - throw errors if database is not available
    const [activeAlertsResult, resolvedAlertsResult, lastRunResult] = await Promise.all([
      getActiveAlerts(),
      getResolvedAlerts(30), // Last 30 days
      getLastMonitoringRun()
    ]);

    // Check for database errors - don't fall back to mock data
    if (activeAlertsResult.error) {
      throw new Error(`Failed to fetch active alerts: ${activeAlertsResult.error.message}`);
    }
    
    if (resolvedAlertsResult.error) {
      throw new Error(`Failed to fetch resolved alerts: ${resolvedAlertsResult.error.message}`);
    }

    const activeAlerts = activeAlertsResult.data || [];
    const resolvedAlerts = resolvedAlertsResult.data || [];
    const lastRun = lastRunResult.data;

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
    console.log(`✅ Fetched live data in ${fetchTime}ms`);
    
    const totalActiveAlerts = activeAlerts.length;
    const totalResolvedAlerts = resolvedAlerts.length;
    console.log(`📊 Found ${totalActiveAlerts} active alerts and ${totalResolvedAlerts} resolved alerts`);

    // Determine monitoring status based on last run
    let monitoringStatus;
    if (lastRun) {
      const lastRunTime = new Date(lastRun.run_at);
      const timeSinceLastRun = Date.now() - lastRunTime.getTime();
      const isRecent = timeSinceLastRun < 300000; // 5 minutes
      
      monitoringStatus = {
        status: isRecent ? 'active' : 'inactive',
        isActive: isRecent,
        lastRun: lastRunTime,
        nextRun: isRecent ? new Date(Date.now() + 60000) : null,
        message: isRecent ? 
          'Real-time monitoring active (60-second intervals)' : 
          'Monitoring inactive - last run was more than 5 minutes ago',
        intervalSeconds: 60,
        consecutiveErrors: 0,
        lastRunStats: {
          duration: lastRun.duration_ms,
          alertsFound: lastRun.alerts_found,
          alertsUpdated: lastRun.alerts_updated,
          alertsResolved: lastRun.alerts_resolved,
          errors: lastRun.errors || [],
          status: lastRun.status
        }
      };
    } else {
      monitoringStatus = {
        status: 'never_run',
        isActive: false,
        lastRun: null,
        nextRun: null,
        message: 'No monitoring runs found in database. Start monitoring to begin collecting data.',
        intervalSeconds: 60,
        consecutiveErrors: 0,
        lastRunStats: null
      };
    }

    return {
      services,
      resolvedAlerts: resolvedAlerts.map(transformAlert),
      lastUpdated: lastRun?.run_at ? new Date(lastRun.run_at) : new Date(),
      monitoringStatus
    };

  } catch (error) {
    console.error('❌ Error fetching live service health data:', error);
    throw error; // Don't return mock data, let the caller handle the error
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
    // First check the database for the last run
    const { data: lastRun, error } = await getLastMonitoringRun();
    
    if (error) {
      throw error;
    }

    // Also check if the real-time monitoring service is running
    const serviceStatus = realTimeMonitoring.getStatus();

    if (!lastRun && !serviceStatus.isRunning) {
      return {
        status: 'never_run',
        message: 'No monitoring runs found. Start monitoring to begin collecting data.',
        lastRun: null,
        intervalSeconds: 60,
        consecutiveErrors: 0,
        lastRunStats: null,
        isRunning: false
      };
    }

    const lastRunTime = lastRun ? new Date(lastRun.run_at) : null;
    const timeSinceLastRun = lastRunTime ? Date.now() - lastRunTime.getTime() : Infinity;
    const isRecent = timeSinceLastRun < 300000; // 5 minutes

    return {
      status: serviceStatus.isRunning ? 'active' : (isRecent ? 'inactive' : 'stopped'),
      message: serviceStatus.isRunning ? 
        'Real-time monitoring active - simulating Microsoft service health checks every 60 seconds' :
        (isRecent ? 
          `Monitoring inactive - last run was ${Math.round(timeSinceLastRun / 60000)} minutes ago` :
          'Monitoring stopped - click "Start Monitoring" to begin'),
      lastRun: lastRunTime,
      intervalSeconds: 60,
      consecutiveErrors: serviceStatus.consecutiveErrors || 0,
      isRunning: serviceStatus.isRunning,
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
    throw error; // Don't return mock data
  }
};

// Start real-time monitoring
export const startRealTimeMonitoring = () => {
  console.log('🚀 Real-time monitoring start requested');
  
  try {
    const result = realTimeMonitoring.start();
    
    if (result.success) {
      return {
        isRunning: true,
        status: 'active',
        message: 'Real-time monitoring started successfully - simulating Microsoft service checks every 60 seconds'
      };
    } else {
      return {
        isRunning: false,
        status: 'error',
        message: result.message || 'Failed to start monitoring'
      };
    }
  } catch (error) {
    console.error('Error starting monitoring:', error);
    return {
      isRunning: false,
      status: 'error',
      message: `Failed to start monitoring: ${error.message}`
    };
  }
};

// Stop real-time monitoring
export const stopRealTimeMonitoring = () => {
  console.log('🛑 Real-time monitoring stop requested');
  
  try {
    const result = realTimeMonitoring.stop();
    
    return {
      isRunning: false,
      status: 'stopped',
      message: result.message || 'Real-time monitoring stopped'
    };
  } catch (error) {
    console.error('Error stopping monitoring:', error);
    return {
      isRunning: false,
      status: 'error',
      message: `Error stopping monitoring: ${error.message}`
    };
  }
};

// Run monitoring cycle immediately (for testing)
export const runMonitoringNow = async () => {
  console.log('⚡ Running immediate monitoring cycle...');
  
  try {
    const result = await realTimeMonitoring.runNow();
    return result;
  } catch (error) {
    console.error('Error running immediate monitoring:', error);
    return {
      success: false,
      message: `Failed to run monitoring: ${error.message}`
    };
  }
};