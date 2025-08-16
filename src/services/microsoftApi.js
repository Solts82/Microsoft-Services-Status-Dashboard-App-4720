import { getActiveAlerts, getResolvedAlerts, getLastMonitoringRun } from '../lib/supabase.js';

// This service now fetches data from our database instead of directly from Microsoft APIs
export const fetchServiceHealth = async () => {
  console.log('🔄 Fetching service health data from database...');
  
  try {
    const startTime = Date.now();
    
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
      }
    ];

    const fetchTime = Date.now() - startTime;
    console.log(`✅ Fetched data from database in ${fetchTime}ms`);
    
    const totalActiveAlerts = activeAlerts.length;
    const totalResolvedAlerts = resolvedAlerts.length;
    
    console.log(`📊 Found ${totalActiveAlerts} active alerts and ${totalResolvedAlerts} resolved alerts`);

    return {
      services,
      resolvedAlerts: resolvedAlerts.map(transformAlert),
      lastUpdated: lastRun?.run_at ? new Date(lastRun.run_at) : new Date(),
      monitoringStatus: {
        isActive: lastRun ? (Date.now() - new Date(lastRun.run_at).getTime() < 120000) : false, // Active if last run was within 2 minutes
        lastRun: lastRun?.run_at ? new Date(lastRun.run_at) : null,
        alertsFound: lastRun?.alerts_found || 0,
        alertsUpdated: lastRun?.alerts_updated || 0,
        alertsResolved: lastRun?.alerts_resolved || 0
      }
    };

  } catch (error) {
    console.error('❌ Error fetching service health from database:', error);
    throw new Error(`Failed to fetch service health data: ${error.message}`);
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
    const { data: lastRun } = await getLastMonitoringRun();
    
    if (!lastRun) {
      return {
        status: 'unknown',
        message: 'No monitoring runs recorded',
        lastRun: null
      };
    }

    const timeSinceLastRun = Date.now() - new Date(lastRun.run_at).getTime();
    const isActive = timeSinceLastRun < 120000; // 2 minutes
    
    return {
      status: isActive ? 'active' : 'inactive',
      message: isActive ? 'Monitoring service is active' : 'Monitoring service appears inactive',
      lastRun: new Date(lastRun.run_at),
      timeSinceLastRun,
      lastRunStats: {
        duration: lastRun.duration_ms,
        alertsFound: lastRun.alerts_found,
        alertsUpdated: lastRun.alerts_updated,
        alertsResolved: lastRun.alerts_resolved,
        errors: lastRun.errors || [],
        status: lastRun.status
      }
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