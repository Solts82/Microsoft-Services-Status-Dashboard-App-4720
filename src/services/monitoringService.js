import axios from 'axios';
import { 
  insertServiceAlert, 
  updateServiceAlert, 
  recordMonitoringRun,
  getActiveAlerts 
} from '../lib/supabase.js';

// Microsoft API endpoints and configurations
const MICROSOFT_ENDPOINTS = {
  AZURE_RSS: 'https://azurestatuscdn.azureedge.net/en-us/status/feed/',
  M365_STATUS: 'https://portal.office.com/servicestatus',
  AZURE_INCIDENTS: 'https://raw.githubusercontent.com/Azure/azure-status/main/data/incidents.json',
  AZURE_STATUS_API: 'https://status.azure.com/en-us/status/history/',
  M365_GRAPH: 'https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/healthOverviews'
};

// CORS proxies for browser-based monitoring
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.codetabs.com/v1/proxy?quest='
];

let currentProxyIndex = 0;

class MonitoringService {
  constructor() {
    this.isRunning = false;
    this.runInterval = null;
    this.lastRun = null;
  }

  // Start continuous monitoring (runs every minute)
  startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log('🚀 Starting Microsoft Service Health Monitoring');
    this.isRunning = true;
    
    // Run immediately
    this.runMonitoringCycle();
    
    // Then run every minute
    this.runInterval = setInterval(() => {
      this.runMonitoringCycle();
    }, 60000); // 60 seconds
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.runInterval) {
      clearInterval(this.runInterval);
      this.runInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Monitoring stopped');
  }

  // Main monitoring cycle
  async runMonitoringCycle() {
    const startTime = Date.now();
    const runId = `run-${Date.now()}`;
    
    console.log(`🔄 Starting monitoring cycle ${runId}`);

    let stats = {
      alertsFound: 0,
      alertsUpdated: 0,
      alertsResolved: 0,
      errors: [],
      azureResponseTime: null,
      m365ResponseTime: null,
      entraResponseTime: null
    };

    try {
      // Get current active alerts from database to check for resolutions
      const { data: currentAlerts } = await getActiveAlerts();
      const activeAlertIds = new Set(currentAlerts?.map(a => a.external_id) || []);

      // Fetch from all Microsoft services
      const [azureResults, m365Results, entraResults] = await Promise.allSettled([
        this.monitorAzureServices(),
        this.monitorM365Services(),
        this.monitorEntraServices()
      ]);

      // Process Azure results
      if (azureResults.status === 'fulfilled') {
        const { alerts, responseTime } = azureResults.value;
        stats.azureResponseTime = responseTime;
        await this.processAlerts('azure', alerts, stats);
        
        // Remove processed alerts from active set
        alerts.forEach(alert => activeAlertIds.delete(alert.external_id));
      } else {
        stats.errors.push(`Azure monitoring failed: ${azureResults.reason}`);
      }

      // Process M365 results
      if (m365Results.status === 'fulfilled') {
        const { alerts, responseTime } = m365Results.value;
        stats.m365ResponseTime = responseTime;
        await this.processAlerts('microsoft365', alerts, stats);
        
        alerts.forEach(alert => activeAlertIds.delete(alert.external_id));
      } else {
        stats.errors.push(`M365 monitoring failed: ${m365Results.reason}`);
      }

      // Process Entra results
      if (entraResults.status === 'fulfilled') {
        const { alerts, responseTime } = entraResults.value;
        stats.entraResponseTime = responseTime;
        await this.processAlerts('entra', alerts, stats);
        
        alerts.forEach(alert => activeAlertIds.delete(alert.external_id));
      } else {
        stats.errors.push(`Entra monitoring failed: ${entraResults.reason}`);
      }

      // Mark remaining active alerts as resolved (they're no longer in the feeds)
      for (const alertId of activeAlertIds) {
        await this.resolveAlert(alertId, stats);
      }

      const duration = Date.now() - startTime;
      this.lastRun = new Date();

      // Record monitoring run
      await recordMonitoringRun({
        run_at: new Date().toISOString(),
        duration_ms: duration,
        alerts_found: stats.alertsFound,
        alerts_updated: stats.alertsUpdated,
        alerts_resolved: stats.alertsResolved,
        errors: stats.errors,
        status: stats.errors.length > 0 ? 'partial' : 'success',
        azure_response_time_ms: stats.azureResponseTime,
        m365_response_time_ms: stats.m365ResponseTime,
        entra_response_time_ms: stats.entraResponseTime
      });

      console.log(`✅ Monitoring cycle completed in ${duration}ms`, {
        found: stats.alertsFound,
        updated: stats.alertsUpdated,
        resolved: stats.alertsResolved,
        errors: stats.errors.length
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Monitoring cycle failed:', error);
      
      stats.errors.push(`Monitoring cycle failed: ${error.message}`);
      
      await recordMonitoringRun({
        run_at: new Date().toISOString(),
        duration_ms: duration,
        alerts_found: 0,
        alerts_updated: 0,
        alerts_resolved: 0,
        errors: stats.errors,
        status: 'failed'
      });
    }
  }

  // Monitor Azure services
  async monitorAzureServices() {
    const startTime = Date.now();
    console.log('📡 Monitoring Azure services...');

    try {
      const alerts = [];
      
      // Try multiple Azure endpoints
      const endpoints = [
        () => this.fetchAzureRSS(),
        () => this.fetchAzureIncidents(),
        () => this.fetchAzureStatusPage()
      ];

      for (const endpoint of endpoints) {
        try {
          const result = await endpoint();
          if (result && result.length > 0) {
            alerts.push(...result);
            break; // Use first successful endpoint
          }
        } catch (err) {
          console.warn('Azure endpoint failed:', err.message);
        }
      }

      const responseTime = Date.now() - startTime;
      return { alerts, responseTime };

    } catch (error) {
      console.error('Azure monitoring failed:', error);
      throw error;
    }
  }

  // Monitor Microsoft 365 services
  async monitorM365Services() {
    const startTime = Date.now();
    console.log('📡 Monitoring Microsoft 365 services...');

    try {
      const alerts = [];
      
      // Try M365 Graph API
      try {
        const graphAlerts = await this.fetchM365Graph();
        alerts.push(...graphAlerts);
      } catch (err) {
        console.warn('M365 Graph API failed:', err.message);
      }

      // Try Office 365 Service Health
      try {
        const statusAlerts = await this.fetchM365Status();
        alerts.push(...statusAlerts);
      } catch (err) {
        console.warn('M365 Status API failed:', err.message);
      }

      const responseTime = Date.now() - startTime;
      return { alerts, responseTime };

    } catch (error) {
      console.error('M365 monitoring failed:', error);
      throw error;
    }
  }

  // Monitor Entra ID services
  async monitorEntraServices() {
    const startTime = Date.now();
    console.log('📡 Monitoring Entra ID services...');

    try {
      const alerts = [];
      
      // Check Entra ID endpoints
      const entraEndpoints = [
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        'https://graph.microsoft.com/v1.0/me'
      ];

      let hasIssues = false;
      for (const endpoint of entraEndpoints) {
        try {
          const proxy = this.getNextProxy();
          const response = await axios.get(`${proxy}${encodeURIComponent(endpoint)}`, {
            timeout: 5000,
            validateStatus: () => true
          });

          if (response.status >= 500) {
            hasIssues = true;
            break;
          }
        } catch (err) {
          hasIssues = true;
          break;
        }
      }

      if (hasIssues) {
        alerts.push({
          external_id: `entra-issues-${Date.now()}`,
          title: 'Microsoft Entra ID Service Issues',
          severity: 'high',
          status: 'investigating',
          impact: 'Users may experience authentication failures and sign-in issues with Microsoft services.',
          affected_services: ['Microsoft Entra ID', 'Azure AD', 'Authentication'],
          region: 'Global',
          source_api: 'Entra Health Check',
          start_time: new Date().toISOString()
        });
      }

      const responseTime = Date.now() - startTime;
      return { alerts, responseTime };

    } catch (error) {
      console.error('Entra monitoring failed:', error);
      throw error;
    }
  }

  // Process alerts and update database
  async processAlerts(serviceName, alerts, stats) {
    for (const alertData of alerts) {
      try {
        const dbAlert = {
          external_id: alertData.external_id,
          service_name: serviceName,
          title: alertData.title,
          severity: alertData.severity,
          status: alertData.status,
          impact: alertData.impact,
          affected_services: alertData.affected_services || [],
          region: alertData.region || 'Global',
          source_api: alertData.source_api,
          start_time: alertData.start_time,
          raw_data: alertData
        };

        // Try to insert (will update if exists due to upsert)
        const { error } = await insertServiceAlert(dbAlert);
        
        if (error) {
          console.error('Failed to insert/update alert:', error);
          stats.errors.push(`Database error: ${error.message}`);
        } else {
          stats.alertsFound++;
          stats.alertsUpdated++;
        }

      } catch (err) {
        console.error('Error processing alert:', err);
        stats.errors.push(`Processing error: ${err.message}`);
      }
    }
  }

  // Mark alert as resolved
  async resolveAlert(externalId, stats) {
    try {
      const { error } = await updateServiceAlert(externalId, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_summary: 'Alert cleared - no longer reported in Microsoft service status feeds.'
      });

      if (error) {
        console.error('Failed to resolve alert:', error);
        stats.errors.push(`Resolution error: ${error.message}`);
      } else {
        stats.alertsResolved++;
        console.log(`✅ Resolved alert: ${externalId}`);
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
      stats.errors.push(`Resolution processing error: ${err.message}`);
    }
  }

  // Helper methods for fetching from different APIs
  async fetchAzureRSS() {
    const proxy = this.getNextProxy();
    const response = await axios.get(`${proxy}${encodeURIComponent(MICROSOFT_ENDPOINTS.AZURE_RSS)}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    return this.parseAzureRSS(response.data);
  }

  async fetchAzureIncidents() {
    const response = await axios.get(MICROSOFT_ENDPOINTS.AZURE_INCIDENTS, { timeout: 10000 });
    return this.parseAzureIncidents(response.data);
  }

  async fetchAzureStatusPage() {
    const proxy = this.getNextProxy();
    const response = await axios.get(`${proxy}${encodeURIComponent('https://status.azure.com/en-us/status')}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    return this.parseAzureStatusPage(response.data);
  }

  async fetchM365Graph() {
    const response = await axios.get(MICROSOFT_ENDPOINTS.M365_GRAPH, { timeout: 10000 });
    return this.parseM365Graph(response.data);
  }

  async fetchM365Status() {
    const proxy = this.getNextProxy();
    const response = await axios.get(`${proxy}${encodeURIComponent(MICROSOFT_ENDPOINTS.M365_STATUS)}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    return this.parseM365Status(response.data);
  }

  // Parsing methods
  parseAzureRSS(xmlData) {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlData, 'text/xml');
      const items = xml.querySelectorAll('item');
      const alerts = [];

      items.forEach((item, index) => {
        if (index >= 20) return; // Limit processing

        const title = item.querySelector('title')?.textContent?.trim();
        const description = item.querySelector('description')?.textContent?.trim();
        const pubDate = item.querySelector('pubDate')?.textContent?.trim();
        const link = item.querySelector('link')?.textContent?.trim();

        if (title && description && !title.toLowerCase().includes('resolved')) {
          alerts.push({
            external_id: `azure-rss-${this.generateAlertId(title, pubDate)}`,
            title: this.cleanTitle(title),
            severity: this.determineSeverity(title, description),
            status: this.determineStatus(description),
            impact: this.cleanDescription(description),
            affected_services: this.extractAffectedServices(description),
            region: this.extractRegion(description),
            source_api: 'Azure RSS Feed',
            start_time: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
          });
        }
      });

      return alerts;
    } catch (error) {
      console.error('Error parsing Azure RSS:', error);
      return [];
    }
  }

  parseAzureIncidents(data) {
    try {
      const incidents = Array.isArray(data) ? data : data.incidents || [];
      return incidents.map(incident => ({
        external_id: incident.id || `azure-incident-${Date.now()}`,
        title: incident.title || incident.name || 'Azure Service Issue',
        severity: incident.severity || this.determineSeverity(incident.title, incident.description),
        status: incident.status || 'investigating',
        impact: incident.description || incident.summary || 'Service impact detected',
        affected_services: incident.services || ['Azure Services'],
        region: incident.region || 'Global',
        source_api: 'Azure Incidents API',
        start_time: incident.startTime ? new Date(incident.startTime).toISOString() : new Date().toISOString()
      })).filter(alert => alert.status !== 'resolved');
    } catch (error) {
      console.error('Error parsing Azure incidents:', error);
      return [];
    }
  }

  parseAzureStatusPage(html) {
    // Simplified HTML parsing for status page
    try {
      const alerts = [];
      
      // Look for common incident indicators in HTML
      if (html.toLowerCase().includes('incident') || html.toLowerCase().includes('degraded')) {
        alerts.push({
          external_id: `azure-status-${Date.now()}`,
          title: 'Azure Service Status Issue Detected',
          severity: 'medium',
          status: 'investigating',
          impact: 'Potential service degradation detected on Azure status page',
          affected_services: ['Azure Services'],
          region: 'Global',
          source_api: 'Azure Status Page',
          start_time: new Date().toISOString()
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error parsing Azure status page:', error);
      return [];
    }
  }

  parseM365Graph(data) {
    try {
      const healthOverviews = data.value || [];
      return healthOverviews
        .filter(overview => overview.status && overview.status.toLowerCase() !== 'servicerestore')
        .map(overview => ({
          external_id: overview.id || `m365-${Date.now()}`,
          title: `${overview.service} - Service Issue`,
          severity: overview.status === 'serviceincident' ? 'high' : 'medium',
          status: 'investigating',
          impact: overview.statusDisplayName || 'Service issue detected',
          affected_services: [overview.service],
          region: 'Global',
          source_api: 'Microsoft Graph API',
          start_time: new Date().toISOString()
        }));
    } catch (error) {
      console.error('Error parsing M365 Graph data:', error);
      return [];
    }
  }

  parseM365Status(data) {
    try {
      const services = Array.isArray(data) ? data : data.services || data.value || [];
      return services
        .filter(service => service.status && !['normal', 'servicerestore'].includes(service.status.toLowerCase()))
        .map(service => ({
          external_id: service.id || `m365-status-${Date.now()}`,
          title: service.displayName || service.name || 'Microsoft 365 Service Issue',
          severity: service.status === 'serviceincident' ? 'high' : 'medium',
          status: 'investigating',
          impact: service.statusDetails || 'Service degradation detected',
          affected_services: [service.displayName || 'Microsoft 365'],
          region: 'Global',
          source_api: 'M365 Status API',
          start_time: new Date().toISOString()
        }));
    } catch (error) {
      console.error('Error parsing M365 status:', error);
      return [];
    }
  }

  // Utility methods
  getNextProxy() {
    const proxy = CORS_PROXIES[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
    return proxy;
  }

  generateAlertId(title, date) {
    const hash = btoa(title + (date || '')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    return hash;
  }

  determineSeverity(title = '', description = '') {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('outage') || text.includes('down') || text.includes('critical') || text.includes('unavailable')) {
      return 'high';
    }
    if (text.includes('degraded') || text.includes('slow') || text.includes('intermittent') || text.includes('partial')) {
      return 'medium';
    }
    return 'low';
  }

  determineStatus(text = '') {
    const status = text.toLowerCase();
    if (status.includes('resolved') || status.includes('restore')) return 'resolved';
    if (status.includes('monitoring')) return 'monitoring';
    if (status.includes('identified')) return 'identified';
    return 'investigating';
  }

  extractRegion(text = '') {
    const regions = ['US East', 'US West', 'Europe', 'Asia Pacific', 'Australia', 'UK', 'Global'];
    for (const region of regions) {
      if (text.toLowerCase().includes(region.toLowerCase())) {
        return region;
      }
    }
    return 'Global';
  }

  extractAffectedServices(text = '') {
    const services = [
      'Azure Active Directory', 'Azure Storage', 'Azure Virtual Machines',
      'Microsoft 365', 'Exchange Online', 'SharePoint', 'Teams', 'OneDrive'
    ];
    
    const found = services.filter(service => 
      text.toLowerCase().includes(service.toLowerCase())
    );
    
    return found.length > 0 ? found : ['Microsoft Services'];
  }

  cleanTitle(title) {
    return title
      .replace(/^\[.*?\]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  cleanDescription(description) {
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);
  }

  // Status methods
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.isRunning ? new Date(Date.now() + 60000) : null
    };
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
export default MonitoringService;