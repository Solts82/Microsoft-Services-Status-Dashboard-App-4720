import { insertServiceAlert, updateServiceAlert, recordMonitoringRun, getActiveAlerts } from '../lib/supabase.js';

// Real-time monitoring service that polls Microsoft APIs every 60 seconds
class RealTimeMonitoringService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.lastRun = null;
    this.consecutiveErrors = 0;
    this.maxRetries = 3;
    
    // Microsoft service endpoints
    this.endpoints = {
      // Azure Status RSS Feed
      azure: 'https://azurestatuscdn.azureedge.net/en-us/status/feed/',
      
      // Microsoft 365 Admin Center API
      m365: 'https://admin.microsoft.com/admin/api/servicehealth/incidents',
      
      // Azure DevOps Status
      azureDevOps: 'https://status.dev.azure.com/_apis/status/health',
      
      // GitHub Status (Microsoft owned)
      github: 'https://www.githubstatus.com/api/v2/incidents.json',
      
      // Alternative endpoints
      azureStatus: 'https://status.azure.com/en-us/status/history/',
      office365Status: 'https://portal.office.com/servicestatus'
    };
    
    console.log('🚀 Real-time Microsoft Service Monitoring initialized');
  }

  // Start continuous monitoring
  start() {
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
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
  }

  // Stop monitoring
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🔴 Real-time monitoring stopped');
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
        this.monitorAzureServices(stats),
        this.monitorMicrosoft365Services(stats),
        this.monitorEntraIDServices(stats),
        this.monitorGitHubServices(stats)
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
        console.warn(`⚠️ Too many consecutive errors (${this.consecutiveErrors}). Consider checking service endpoints.`);
      }
    }
  }

  // Monitor Azure services
  async monitorAzureServices(stats) {
    const startTime = Date.now();
    console.log('📡 Checking Azure services...');
    
    try {
      const alerts = [];
      
      // Try Azure RSS feed first
      try {
        const rssAlerts = await this.fetchAzureRSS();
        alerts.push(...rssAlerts);
        stats.services.azure.checked = true;
      } catch (err) {
        console.warn('Azure RSS failed:', err.message);
        stats.services.azure.error = err.message;
      }
      
      // Try Azure status page as backup
      if (alerts.length === 0) {
        try {
          const statusAlerts = await this.fetchAzureStatus();
          alerts.push(...statusAlerts);
          stats.services.azure.checked = true;
        } catch (err) {
          console.warn('Azure status page failed:', err.message);
          stats.services.azure.error = err.message;
        }
      }
      
      stats.services.azure.responseTime = Date.now() - startTime;
      stats.services.azure.alerts = alerts.length;
      
      return alerts.map(alert => ({
        ...alert,
        service_name: 'azure'
      }));
      
    } catch (error) {
      stats.errors.push(`Azure monitoring: ${error.message}`);
      return [];
    }
  }

  // Monitor Microsoft 365 services
  async monitorMicrosoft365Services(stats) {
    const startTime = Date.now();
    console.log('📡 Checking Microsoft 365 services...');
    
    try {
      const alerts = [];
      
      // Check Microsoft 365 service health
      try {
        const m365Alerts = await this.fetchMicrosoft365Status();
        alerts.push(...m365Alerts);
        stats.services.m365.checked = true;
      } catch (err) {
        console.warn('M365 status failed:', err.message);
        stats.services.m365.error = err.message;
      }
      
      stats.services.m365.responseTime = Date.now() - startTime;
      stats.services.m365.alerts = alerts.length;
      
      return alerts.map(alert => ({
        ...alert,
        service_name: 'microsoft365'
      }));
      
    } catch (error) {
      stats.errors.push(`Microsoft 365 monitoring: ${error.message}`);
      return [];
    }
  }

  // Monitor Entra ID services
  async monitorEntraIDServices(stats) {
    const startTime = Date.now();
    console.log('📡 Checking Entra ID services...');
    
    try {
      const alerts = [];
      
      // Health check critical Entra ID endpoints
      const entraEndpoints = [
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        'https://graph.microsoft.com/v1.0/$metadata'
      ];
      
      let failedEndpoints = 0;
      
      for (const endpoint of entraEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            mode: 'no-cors', // Handle CORS issues
            timeout: 5000
          });
          // If we get here without error, endpoint is likely accessible
        } catch (err) {
          failedEndpoints++;
          console.warn(`Entra endpoint check failed: ${endpoint}`, err.message);
        }
      }
      
      // If multiple endpoints are failing, create an alert
      if (failedEndpoints >= entraEndpoints.length / 2) {
        alerts.push({
          external_id: `entra-health-${Date.now()}`,
          title: 'Microsoft Entra ID Service Health Check Failed',
          severity: failedEndpoints === entraEndpoints.length ? 'high' : 'medium',
          status: 'investigating',
          impact: 'Authentication services may be experiencing issues. Users might have trouble signing in.',
          affected_services: ['Microsoft Entra ID', 'Azure AD', 'Authentication'],
          region: 'Global',
          source_api: 'Entra Health Check',
          start_time: new Date().toISOString()
        });
      }
      
      stats.services.entra.responseTime = Date.now() - startTime;
      stats.services.entra.alerts = alerts.length;
      stats.services.entra.checked = true;
      
      return alerts.map(alert => ({
        ...alert,
        service_name: 'entra'
      }));
      
    } catch (error) {
      stats.errors.push(`Entra ID monitoring: ${error.message}`);
      return [];
    }
  }

  // Monitor GitHub services (Microsoft-owned)
  async monitorGitHubServices(stats) {
    const startTime = Date.now();
    console.log('📡 Checking GitHub services...');
    
    try {
      const alerts = [];
      
      // Check GitHub status API
      try {
        const response = await fetch('https://www.githubstatus.com/api/v2/incidents.json', {
          timeout: 10000
        });
        
        if (response.ok) {
          const data = await response.json();
          const activeIncidents = data.incidents?.filter(incident => 
            incident.status !== 'resolved' && 
            incident.status !== 'postmortem'
          ) || [];
          
          for (const incident of activeIncidents) {
            alerts.push({
              external_id: `github-${incident.id}`,
              title: `GitHub: ${incident.name}`,
              severity: incident.impact === 'critical' ? 'high' : 'medium',
              status: 'investigating',
              impact: incident.body || 'GitHub service incident detected',
              affected_services: ['GitHub', 'GitHub Actions', 'GitHub Pages'],
              region: 'Global',
              source_api: 'GitHub Status API',
              start_time: new Date(incident.created_at).toISOString()
            });
          }
        }
        
        stats.services.github.checked = true;
      } catch (err) {
        console.warn('GitHub status failed:', err.message);
        stats.services.github.error = err.message;
      }
      
      stats.services.github.responseTime = Date.now() - startTime;
      stats.services.github.alerts = alerts.length;
      
      return alerts.map(alert => ({
        ...alert,
        service_name: 'github'
      }));
      
    } catch (error) {
      stats.errors.push(`GitHub monitoring: ${error.message}`);
      return [];
    }
  }

  // Fetch Azure RSS feed
  async fetchAzureRSS() {
    try {
      // Use a CORS proxy to fetch the RSS feed
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const targetUrl = encodeURIComponent(this.endpoints.azure);
      
      const response = await fetch(`${proxyUrl}${targetUrl}`, {
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xmlText = await response.text();
      return this.parseAzureRSS(xmlText);
    } catch (error) {
      throw new Error(`Azure RSS fetch failed: ${error.message}`);
    }
  }

  // Fetch Azure status page
  async fetchAzureStatus() {
    // This would require scraping the status page
    // For now, return empty array
    return [];
  }

  // Fetch Microsoft 365 status
  async fetchMicrosoft365Status() {
    // This would require authenticated access to Microsoft Graph API
    // For now, we'll simulate checking for common M365 issues
    
    // Check if common M365 services are accessible
    const services = [
      'https://outlook.office365.com',
      'https://teams.microsoft.com',
      'https://sharepoint.com'
    ];
    
    const alerts = [];
    let failedServices = 0;
    
    for (const service of services) {
      try {
        const response = await fetch(service, {
          method: 'GET',
          mode: 'no-cors',
          timeout: 5000
        });
      } catch (err) {
        failedServices++;
      }
    }
    
    // If multiple services are failing, create an alert
    if (failedServices > 0) {
      alerts.push({
        external_id: `m365-health-${Date.now()}`,
        title: 'Microsoft 365 Service Connectivity Issues',
        severity: failedServices >= services.length / 2 ? 'high' : 'medium',
        status: 'investigating',
        impact: 'Some Microsoft 365 services may be experiencing connectivity issues.',
        affected_services: ['Microsoft 365', 'Outlook', 'Teams', 'SharePoint'],
        region: 'Global',
        source_api: 'M365 Health Check',
        start_time: new Date().toISOString()
      });
    }
    
    return alerts;
  }

  // Parse Azure RSS feed
  parseAzureRSS(xmlText) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const items = xmlDoc.querySelectorAll('item');
      const alerts = [];
      
      // Process only recent items (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      items.forEach((item, index) => {
        if (index >= 10) return; // Limit to 10 most recent items
        
        const title = item.querySelector('title')?.textContent?.trim();
        const description = item.querySelector('description')?.textContent?.trim();
        const pubDate = item.querySelector('pubDate')?.textContent?.trim();
        const link = item.querySelector('link')?.textContent?.trim();
        
        if (!title || !description) return;
        
        const publishDate = new Date(pubDate);
        if (publishDate < oneDayAgo) return; // Skip old items
        
        // Skip resolved items
        if (title.toLowerCase().includes('resolved') || 
            description.toLowerCase().includes('resolved')) return;
        
        // Only include active incidents
        if (description.toLowerCase().includes('investigating') ||
            description.toLowerCase().includes('degraded') ||
            description.toLowerCase().includes('outage') ||
            description.toLowerCase().includes('incident')) {
          
          alerts.push({
            external_id: `azure-rss-${this.generateHash(title + pubDate)}`,
            title: this.cleanTitle(title),
            severity: this.determineSeverity(title + ' ' + description),
            status: this.determineStatus(description),
            impact: this.cleanDescription(description),
            affected_services: this.extractAffectedServices(description),
            region: this.extractRegion(description),
            source_api: 'Azure RSS Feed',
            start_time: publishDate.toISOString()
          });
        }
      });
      
      return alerts;
    } catch (error) {
      throw new Error(`RSS parsing failed: ${error.message}`);
    }
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
        resolution_summary: 'Alert automatically resolved - no longer reported in service status feeds.'
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

  // Utility methods
  generateHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  determineSeverity(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical') || lowerText.includes('outage') || 
        lowerText.includes('down') || lowerText.includes('unavailable')) {
      return 'high';
    }
    if (lowerText.includes('degraded') || lowerText.includes('slow') || 
        lowerText.includes('intermittent') || lowerText.includes('partial')) {
      return 'medium';
    }
    return 'low';
  }

  determineStatus(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('resolved') || lowerText.includes('restored')) return 'resolved';
    if (lowerText.includes('monitoring')) return 'monitoring';
    if (lowerText.includes('identified')) return 'identified';
    return 'investigating';
  }

  extractRegion(text) {
    const regions = ['US East', 'US West', 'Europe', 'Asia Pacific', 'Australia', 'UK', 'Canada'];
    for (const region of regions) {
      if (text.toLowerCase().includes(region.toLowerCase())) {
        return region;
      }
    }
    return 'Global';
  }

  extractAffectedServices(text) {
    const services = [
      'Azure Storage', 'Azure Virtual Machines', 'Azure SQL', 'Azure Active Directory',
      'Microsoft 365', 'Exchange Online', 'SharePoint', 'Teams', 'OneDrive',
      'Azure App Service', 'Azure Functions', 'Azure Kubernetes'
    ];
    
    const found = services.filter(service => 
      text.toLowerCase().includes(service.toLowerCase())
    );
    
    return found.length > 0 ? found : ['Microsoft Services'];
  }

  cleanTitle(title) {
    return title
      .replace(/^\[.*?\]\s*/, '') // Remove [brackets]
      .replace(/\s+/g, ' ')
      .trim();
  }

  cleanDescription(description) {
    return description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit length
  }

  // Get monitoring status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.isRunning ? new Date(Date.now() + 60000) : null,
      consecutiveErrors: this.consecutiveErrors,
      intervalSeconds: 60
    };
  }
}

// Export singleton instance
export const realTimeMonitoring = new RealTimeMonitoringService();
export default RealTimeMonitoringService;