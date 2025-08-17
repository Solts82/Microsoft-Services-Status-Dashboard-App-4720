import { insertServiceAlert, updateServiceAlert, recordMonitoringRun, getActiveAlerts } from '../lib/supabase.js';

// Real-time monitoring service that simulates Microsoft API monitoring
class RealTimeMonitoringService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.lastRun = null;
    this.consecutiveErrors = 0;
    this.maxRetries = 3;
    
    // Microsoft service simulation endpoints (for demo purposes)
    this.simulatedServices = {
      azure: {
        name: 'Microsoft Azure',
        baseIssueRate: 0.1, // 10% chance of issues
        currentIssues: []
      },
      microsoft365: {
        name: 'Microsoft 365',
        baseIssueRate: 0.08, // 8% chance of issues
        currentIssues: []
      },
      entra: {
        name: 'Microsoft Entra ID',
        baseIssueRate: 0.05, // 5% chance of issues
        currentIssues: []
      },
      github: {
        name: 'GitHub (Microsoft)',
        baseIssueRate: 0.06, // 6% chance of issues
        currentIssues: []
      }
    };

    console.log('🚀 Real-time Microsoft Service Monitoring initialized');
  }

  // Start continuous monitoring
  start() {
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return {
        success: false,
        message: 'Monitoring is already running'
      };
    }

    console.log('🟢 Starting real-time monitoring (60-second intervals)');
    this.isRunning = true;
    this.consecutiveErrors = 0;

    // Run immediately
    this.runMonitoringCycle();

    // Then run every 60 seconds
    this.intervalId = setInterval(() => {
      this.runMonitoringCycle();
    }, 60000);

    return {
      success: true,
      message: 'Real-time monitoring started successfully'
    };
  }

  // Stop monitoring
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🔴 Real-time monitoring stopped');

    return {
      success: true,
      message: 'Real-time monitoring stopped'
    };
  }

  // Main monitoring cycle
  async runMonitoringCycle() {
    const cycleStart = Date.now();
    const runId = `cycle-${cycleStart}`;
    
    console.log(`🔄 [${runId}] Starting monitoring cycle`);

    const stats = {
      alertsFound: 0,
      alertsUpdated: 0,
      alertsResolved: 0,
      errors: [],
      services: {
        azure: { checked: false, alerts: 0, responseTime: 0, error: null },
        m365: { checked: false, alerts: 0, responseTime: 0, error: null },
        entra: { checked: false, alerts: 0, responseTime: 0, error: null },
        github: { checked: false, alerts: 0, responseTime: 0, error: null }
      }
    };

    try {
      // Get current alerts to check for resolutions
      const { data: currentAlerts } = await getActiveAlerts();
      const activeAlertIds = new Set(currentAlerts?.map(a => a.external_id) || []);

      // Monitor all services in parallel
      const monitoringTasks = [
        this.monitorService('azure', stats),
        this.monitorService('microsoft365', stats),
        this.monitorService('entra', stats),
        this.monitorService('github', stats)
      ];

      // Wait for all monitoring tasks
      const results = await Promise.allSettled(monitoringTasks);

      // Process results and collect new alerts
      const allNewAlerts = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allNewAlerts.push(...result.value);
        } else if (result.status === 'rejected') {
          const serviceName = ['Azure', 'Microsoft 365', 'Entra ID', 'GitHub'][index];
          stats.errors.push(`${serviceName}: ${result.reason}`);
        }
      });

      // Process new alerts
      for (const alert of allNewAlerts) {
        await this.processAlert(alert, stats);
        activeAlertIds.delete(alert.external_id);
      }

      // Resolve alerts that are no longer active
      for (const alertId of activeAlertIds) {
        await this.resolveAlert(alertId, stats);
      }

      const cycleDuration = Date.now() - cycleStart;
      this.lastRun = new Date();
      this.consecutiveErrors = 0;

      // Record successful monitoring run
      await recordMonitoringRun({
        run_at: new Date().toISOString(),
        duration_ms: cycleDuration,
        alerts_found: stats.alertsFound,
        alerts_updated: stats.alertsUpdated,
        alerts_resolved: stats.alertsResolved,
        errors: stats.errors,
        status: stats.errors.length > 0 ? 'partial' : 'success',
        azure_response_time_ms: stats.services.azure.responseTime,
        m365_response_time_ms: stats.services.m365.responseTime
      });

      console.log(`✅ [${runId}] Cycle completed in ${cycleDuration}ms`, {
        found: stats.alertsFound,
        updated: stats.alertsUpdated,
        resolved: stats.alertsResolved,
        errors: stats.errors.length
      });

    } catch (error) {
      this.consecutiveErrors++;
      const cycleDuration = Date.now() - cycleStart;
      
      console.error(`❌ [${runId}] Monitoring cycle failed:`, error);

      // Record failed run
      await recordMonitoringRun({
        run_at: new Date().toISOString(),
        duration_ms: cycleDuration,
        alerts_found: 0,
        alerts_updated: 0,
        alerts_resolved: 0,
        errors: [error.message],
        status: 'failed'
      });

      // If too many consecutive errors, increase interval
      if (this.consecutiveErrors >= this.maxRetries) {
        console.warn(`⚠️ Too many consecutive errors (${this.consecutiveErrors}). Monitoring continues but may be less reliable.`);
      }
    }
  }

  // Monitor individual service (simulated)
  async monitorService(serviceName, stats) {
    const startTime = Date.now();
    const serviceKey = serviceName === 'microsoft365' ? 'm365' : serviceName;
    
    console.log(`📡 Checking ${serviceName} services...`);

    try {
      const alerts = [];
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

      // Simulate service monitoring with realistic scenarios
      const serviceData = this.simulatedServices[serviceName];
      if (serviceData) {
        // Check if we should generate a new issue
        const shouldHaveIssue = Math.random() < serviceData.baseIssueRate;
        
        if (shouldHaveIssue && serviceData.currentIssues.length === 0) {
          // Generate a new issue
          const newIssue = this.generateRealisticIssue(serviceName);
          serviceData.currentIssues.push(newIssue);
          alerts.push(newIssue);
        } else if (serviceData.currentIssues.length > 0) {
          // Check if existing issues should be resolved
          serviceData.currentIssues = serviceData.currentIssues.filter(issue => {
            const issueAge = Date.now() - new Date(issue.start_time).getTime();
            const shouldResolve = issueAge > 300000 || Math.random() < 0.3; // 5 min min age or 30% chance
            
            if (!shouldResolve) {
              alerts.push(issue); // Keep the issue active
            }
            
            return !shouldResolve;
          });
        }
      }

      const responseTime = Date.now() - startTime;
      stats.services[serviceKey].responseTime = responseTime;
      stats.services[serviceKey].alerts = alerts.length;
      stats.services[serviceKey].checked = true;

      return alerts.map(alert => ({
        ...alert,
        service_name: serviceName
      }));

    } catch (error) {
      stats.errors.push(`${serviceName} monitoring: ${error.message}`);
      stats.services[serviceKey].error = error.message;
      return [];
    }
  }

  // Generate realistic service issues
  generateRealisticIssue(serviceName) {
    const issueTemplates = {
      azure: [
        {
          title: 'Azure Storage Performance Degradation',
          severity: 'medium',
          impact: 'Users may experience slower than normal response times when accessing blob storage.',
          affected_services: ['Azure Blob Storage', 'Azure Files'],
          regions: ['US East', 'US West', 'Europe', 'Asia Pacific']
        },
        {
          title: 'Azure Virtual Machines Connectivity Issues',
          severity: 'high',
          impact: 'Some virtual machines may experience intermittent connectivity issues.',
          affected_services: ['Azure Virtual Machines', 'Azure Compute'],
          regions: ['US East', 'Europe']
        },
        {
          title: 'Azure SQL Database Performance Issues',
          severity: 'medium',
          impact: 'Database queries may experience increased latency.',
          affected_services: ['Azure SQL Database', 'Azure SQL'],
          regions: ['Global']
        }
      ],
      microsoft365: [
        {
          title: 'Teams Meeting Join Issues',
          severity: 'high',
          impact: 'Some users are unable to join Microsoft Teams meetings.',
          affected_services: ['Microsoft Teams', 'Teams Meetings'],
          regions: ['Global']
        },
        {
          title: 'Exchange Online Email Delays',
          severity: 'medium',
          impact: 'Email delivery may be delayed for some users.',
          affected_services: ['Exchange Online', 'Outlook'],
          regions: ['US East', 'Europe']
        },
        {
          title: 'SharePoint Online Performance Degradation',
          severity: 'low',
          impact: 'SharePoint sites may load slower than usual.',
          affected_services: ['SharePoint Online', 'OneDrive'],
          regions: ['US West', 'Asia Pacific']
        }
      ],
      entra: [
        {
          title: 'Authentication Service Delays',
          severity: 'high',
          impact: 'Users may experience delays when signing in to Microsoft services.',
          affected_services: ['Microsoft Entra ID', 'Azure AD', 'Authentication'],
          regions: ['Global']
        },
        {
          title: 'Multi-Factor Authentication Issues',
          severity: 'medium',
          impact: 'Some users may have trouble completing multi-factor authentication.',
          affected_services: ['Microsoft Entra ID', 'MFA', 'Authentication'],
          regions: ['US East', 'Europe']
        }
      ],
      github: [
        {
          title: 'GitHub Actions Performance Issues',
          severity: 'medium',
          impact: 'GitHub Actions workflows may experience longer than usual execution times.',
          affected_services: ['GitHub Actions', 'CI/CD'],
          regions: ['Global']
        },
        {
          title: 'GitHub Pages Deployment Delays',
          severity: 'low',
          impact: 'GitHub Pages deployments may be delayed.',
          affected_services: ['GitHub Pages', 'Static Sites'],
          regions: ['US East', 'Europe']
        }
      ]
    };

    const templates = issueTemplates[serviceName] || [];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    if (!template) {
      return null;
    }

    const region = template.regions[Math.floor(Math.random() * template.regions.length)];
    
    return {
      external_id: `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: template.title,
      severity: template.severity,
      status: 'investigating',
      impact: template.impact,
      affected_services: template.affected_services,
      region: region,
      source_api: 'Live Monitoring System',
      start_time: new Date().toISOString()
    };
  }

  // Process and store alert
  async processAlert(alertData, stats) {
    try {
      const { error } = await insertServiceAlert(alertData);
      if (error) {
        console.error('Failed to store alert:', error);
        stats.errors.push(`Database error: ${error.message}`);
      } else {
        stats.alertsFound++;
        stats.alertsUpdated++;
        console.log(`📝 Alert stored: ${alertData.title}`);
      }
    } catch (err) {
      console.error('Error processing alert:', err);
      stats.errors.push(`Processing error: ${err.message}`);
    }
  }

  // Resolve alert that's no longer active
  async resolveAlert(externalId, stats) {
    try {
      const { error } = await updateServiceAlert(externalId, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_summary: 'Alert automatically resolved - service monitoring indicates the issue has been cleared.'
      });

      if (error) {
        console.error('Failed to resolve alert:', error);
        stats.errors.push(`Resolution error: ${error.message}`);
      } else {
        stats.alertsResolved++;
        console.log(`✅ Alert resolved: ${externalId}`);
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
      stats.errors.push(`Resolution processing error: ${err.message}`);
    }
  }

  // Get monitoring status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.isRunning ? new Date(Date.now() + 60000) : null,
      consecutiveErrors: this.consecutiveErrors,
      intervalSeconds: 60,
      message: this.isRunning ? 
        'Real-time monitoring active - simulating Microsoft service health checks every 60 seconds' :
        'Monitoring stopped'
    };
  }

  // Force a monitoring cycle (for testing)
  async runNow() {
    if (!this.isRunning) {
      return {
        success: false,
        message: 'Monitoring is not running. Start monitoring first.'
      };
    }

    console.log('🚀 Running immediate monitoring cycle...');
    await this.runMonitoringCycle();
    
    return {
      success: true,
      message: 'Monitoring cycle completed'
    };
  }
}

// Export singleton instance
export const realTimeMonitoring = new RealTimeMonitoringService();
export default RealTimeMonitoringService;