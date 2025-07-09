// Microsoft Service Health API endpoints
const API_BASE = 'https://graph.microsoft.com/v1.0';

// Note: In a production environment, you would need proper authentication
// For demo purposes, we'll simulate the API responses
export const fetchServiceHealth = async () => {
  try {
    // In a real implementation, you would make authenticated requests to:
    // 1. Microsoft Graph API for service health
    // 2. Azure Service Health API
    // 3. Microsoft 365 Service Health API
    
    // For now, we'll return demo data that simulates real service health data
    return await simulateApiCall();
  } catch (error) {
    console.error('Error fetching service health:', error);
    throw error;
  }
};

const simulateApiCall = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simulate different scenarios based on current time
  const now = new Date();
  const hour = now.getHours();
  
  // Different scenarios throughout the day
  if (hour >= 9 && hour <= 17) {
    // Business hours - more likely to have alerts
    return getBusinessHoursData();
  } else {
    // Off hours - fewer alerts
    return getOffHoursData();
  }
};

const getBusinessHoursData = () => ({
  services: [
    {
      id: 'azure',
      name: 'Microsoft Azure',
      status: 'degraded',
      alerts: [
        {
          id: 'az-001',
          title: 'Azure Virtual Machines - Performance Degradation',
          severity: 'medium',
          status: 'investigating',
          impact: 'Virtual Machine instances may experience slower performance in West US 2 region. Users may notice increased boot times and reduced network throughput.',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
          affectedServices: ['Virtual Machines', 'App Service', 'Container Instances'],
          region: 'West US 2'
        },
        {
          id: 'az-002',
          title: 'Azure Storage - Intermittent Access Issues',
          severity: 'low',
          status: 'monitoring',
          impact: 'Some storage accounts may experience intermittent connectivity issues',
          startTime: new Date(Date.now() - 45 * 60 * 1000),
          lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
          affectedServices: ['Blob Storage', 'File Storage'],
          region: 'East US'
        }
      ]
    },
    {
      id: 'entra',
      name: 'Microsoft Entra ID',
      status: 'degraded',
      alerts: [
        {
          id: 'entra-001',
          title: 'Authentication Delays',
          severity: 'high',
          status: 'investigating',
          impact: 'Users may experience delays of up to 30 seconds when signing in to applications. Multi-factor authentication prompts may be delayed.',
          startTime: new Date(Date.now() - 45 * 60 * 1000),
          lastUpdated: new Date(Date.now() - 10 * 60 * 1000),
          affectedServices: ['Single Sign-On', 'Multi-Factor Authentication', 'Application Proxy'],
          region: 'Global'
        }
      ]
    },
    {
      id: 'microsoft365',
      name: 'Microsoft 365',
      status: 'operational',
      alerts: []
    }
  ],
  resolvedAlerts: getResolvedAlerts()
});

const getOffHoursData = () => ({
  services: [
    {
      id: 'azure',
      name: 'Microsoft Azure',
      status: 'operational',
      alerts: []
    },
    {
      id: 'entra',
      name: 'Microsoft Entra ID',
      status: 'operational',
      alerts: []
    },
    {
      id: 'microsoft365',
      name: 'Microsoft 365',
      status: 'operational',
      alerts: []
    }
  ],
  resolvedAlerts: getResolvedAlerts()
});

const getResolvedAlerts = () => [
  {
    id: 'resolved-001',
    title: 'Exchange Online - Email Delivery Delays',
    severity: 'medium',
    status: 'resolved',
    impact: 'Users experienced delays in email delivery of up to 15 minutes. All queued emails have been successfully delivered.',
    startTime: new Date(Date.now() - 6 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
    resolvedTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    affectedServices: ['Exchange Online', 'Outlook Web App', 'Outlook Mobile'],
    region: 'North America',
    resolutionSummary: 'The issue was caused by a configuration change in our mail routing system. We have reverted the change and implemented additional monitoring to prevent similar issues.'
  },
  {
    id: 'resolved-002',
    title: 'Teams - Meeting Join Issues',
    severity: 'high',
    status: 'resolved',
    impact: 'Some users were unable to join Microsoft Teams meetings and experienced connection failures.',
    startTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000),
    resolvedTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    affectedServices: ['Microsoft Teams', 'Teams Mobile App'],
    region: 'Europe',
    resolutionSummary: 'A server capacity issue was identified and resolved by scaling up our infrastructure. All users can now join meetings normally.'
  },
  {
    id: 'resolved-003',
    title: 'SharePoint Online - File Upload Failures',
    severity: 'low',
    status: 'resolved',
    impact: 'Users experienced intermittent failures when uploading files to SharePoint Online document libraries.',
    startTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 8 * 60 * 60 * 1000),
    resolvedTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    affectedServices: ['SharePoint Online', 'OneDrive for Business'],
    region: 'Asia Pacific',
    resolutionSummary: 'A temporary storage service issue was resolved by our engineering team. File uploads are now working normally across all regions.'
  },
  {
    id: 'resolved-004',
    title: 'Azure Active Directory - Sign-in Latency',
    severity: 'medium',
    status: 'resolved',
    impact: 'Users experienced increased latency when signing into Azure AD-integrated applications.',
    startTime: new Date(Date.now() - 18 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 14 * 60 * 60 * 1000),
    resolvedTime: new Date(Date.now() - 14 * 60 * 60 * 1000),
    affectedServices: ['Azure Active Directory', 'Enterprise Applications'],
    region: 'Global',
    resolutionSummary: 'Database performance optimization was applied to improve sign-in response times. Authentication latency has returned to normal levels.'
  },
  {
    id: 'resolved-005',
    title: 'Power BI - Dashboard Loading Issues',
    severity: 'low',
    status: 'resolved',
    impact: 'Some Power BI dashboards were loading slowly or timing out for certain users.',
    startTime: new Date(Date.now() - 20 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 16 * 60 * 60 * 1000),
    resolvedTime: new Date(Date.now() - 16 * 60 * 60 * 1000),
    affectedServices: ['Power BI Service', 'Power BI Mobile'],
    region: 'South America',
    resolutionSummary: 'A caching layer issue was identified and fixed. Dashboard performance has been restored to normal levels.'
  },
  {
    id: 'resolved-006',
    title: 'Dynamics 365 - Performance Degradation',
    severity: 'high',
    status: 'resolved',
    impact: 'Dynamics 365 applications experienced significant performance degradation causing slow page loads and timeouts.',
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    lastUpdated: new Date(Date.now() - 20 * 60 * 60 * 1000),
    resolvedTime: new Date(Date.now() - 20 * 60 * 60 * 1000),
    affectedServices: ['Dynamics 365 Sales', 'Dynamics 365 Customer Service', 'Dynamics 365 Marketing'],
    region: 'Global',
    resolutionSummary: 'A database indexing issue was causing query performance problems. We rebuilt the affected indexes and implemented query optimization improvements.'
  }
];