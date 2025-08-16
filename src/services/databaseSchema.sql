-- Microsoft Service Health Monitoring Database Schema
-- This schema is designed to store all service alerts permanently with full history

-- Service Alerts Table - Main table storing all alerts (never delete data)
CREATE TABLE IF NOT EXISTS service_alerts_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL, -- ID from Microsoft APIs
  service_name TEXT NOT NULL, -- Azure, Microsoft 365, Entra ID
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  impact TEXT,
  affected_services JSONB DEFAULT '[]'::jsonb,
  region TEXT,
  source_api TEXT, -- Which API/RSS feed this came from
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_summary TEXT,
  raw_data JSONB, -- Store original API response for reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_resolution CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL) OR 
    (status != 'resolved')
  )
);

-- Monitoring Runs Table - Track each monitoring cycle
CREATE TABLE IF NOT EXISTS monitoring_runs_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER,
  alerts_found INTEGER DEFAULT 0,
  alerts_updated INTEGER DEFAULT 0,
  alerts_resolved INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  
  -- Performance data
  azure_response_time_ms INTEGER,
  m365_response_time_ms INTEGER,
  entra_response_time_ms INTEGER
);

-- Alert Comments Table
CREATE TABLE IF NOT EXISTS alert_comments_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT NOT NULL, -- References external_id from service_alerts
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES alert_comments_ms2024(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment Votes Table
CREATE TABLE IF NOT EXISTS comment_votes_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES alert_comments_ms2024(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id)
);

-- Alert Subscriptions Table
CREATE TABLE IF NOT EXISTS alert_subscriptions_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  regions JSONB DEFAULT '["global"]'::jsonb,
  email_notifications BOOLEAN DEFAULT TRUE,
  severity_filter JSONB DEFAULT '["high", "critical"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  notification_email TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_alerts_status ON service_alerts_ms2024(status);
CREATE INDEX IF NOT EXISTS idx_service_alerts_service ON service_alerts_ms2024(service_name);
CREATE INDEX IF NOT EXISTS idx_service_alerts_severity ON service_alerts_ms2024(severity);
CREATE INDEX IF NOT EXISTS idx_service_alerts_created ON service_alerts_ms2024(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_alerts_resolved ON service_alerts_ms2024(resolved_at DESC) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_alerts_external ON service_alerts_ms2024(external_id);
CREATE INDEX IF NOT EXISTS idx_service_alerts_start_time ON service_alerts_ms2024(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_runs_date ON monitoring_runs_ms2024(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_comments_alert ON alert_comments_ms2024(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_comments_created ON alert_comments_ms2024(created_at DESC);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_service_alerts_search ON service_alerts_ms2024 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(impact, '')));

-- Row Level Security Policies
ALTER TABLE service_alerts_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_runs_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_comments_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles_ms2024 ENABLE ROW LEVEL SECURITY;

-- Public read access for alerts and monitoring data
CREATE POLICY "Public read access for alerts" ON service_alerts_ms2024
  FOR SELECT USING (true);

CREATE POLICY "Public read access for monitoring runs" ON monitoring_runs_ms2024
  FOR SELECT USING (true);

-- Comments policies
CREATE POLICY "Public read access for comments" ON alert_comments_ms2024
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON alert_comments_ms2024
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own comments" ON alert_comments_ms2024
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Votes policies
CREATE POLICY "Public read access for votes" ON comment_votes_ms2024
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON comment_votes_ms2024
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON comment_votes_ms2024
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON comment_votes_ms2024
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Subscription policies
CREATE POLICY "Users can manage own subscriptions" ON alert_subscriptions_ms2024
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Profile policies
CREATE POLICY "Users can manage own profiles" ON user_profiles_ms2024
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Service account policies for monitoring system
-- Note: In production, create a service role for the monitoring system
CREATE POLICY "Service account can manage alerts" ON service_alerts_ms2024
  FOR ALL USING (true);

CREATE POLICY "Service account can manage monitoring runs" ON monitoring_runs_ms2024
  FOR ALL USING (true);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_service_alerts_updated_at 
  BEFORE UPDATE ON service_alerts_ms2024
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_comments_updated_at 
  BEFORE UPDATE ON alert_comments_ms2024
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_subscriptions_updated_at 
  BEFORE UPDATE ON alert_subscriptions_ms2024
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles_ms2024
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for active alerts with computed fields
CREATE OR REPLACE VIEW active_alerts_view AS
SELECT 
  *,
  EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - start_time))/3600 as duration_hours,
  CASE 
    WHEN resolved_at IS NOT NULL THEN 'resolved'
    WHEN status = 'investigating' THEN 'active'
    WHEN status = 'monitoring' THEN 'monitoring'
    ELSE 'unknown'
  END as computed_status
FROM service_alerts_ms2024
WHERE status IN ('investigating', 'identified', 'monitoring')
ORDER BY start_time DESC;

-- View for recent resolved alerts (last 30 days)
CREATE OR REPLACE VIEW recent_resolved_alerts_view AS
SELECT 
  *,
  EXTRACT(EPOCH FROM (resolved_at - start_time))/3600 as resolution_time_hours
FROM service_alerts_ms2024
WHERE 
  status = 'resolved' 
  AND resolved_at >= NOW() - INTERVAL '30 days'
ORDER BY resolved_at DESC;

-- Statistics view for monitoring dashboard
CREATE OR REPLACE VIEW monitoring_stats_view AS
SELECT 
  DATE_TRUNC('day', run_at) as date,
  COUNT(*) as runs_count,
  AVG(duration_ms) as avg_duration_ms,
  SUM(alerts_found) as total_alerts_found,
  SUM(alerts_updated) as total_alerts_updated,
  SUM(alerts_resolved) as total_alerts_resolved,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_runs
FROM monitoring_runs_ms2024
WHERE run_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', run_at)
ORDER BY date DESC;