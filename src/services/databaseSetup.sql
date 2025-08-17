-- Microsoft Service Health Dashboard - Database Setup
-- Run this in your Supabase SQL Editor to set up all required tables

-- Service Alerts Table
CREATE TABLE IF NOT EXISTS service_alerts_ms2024 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE NOT NULL,
    service_name TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    impact TEXT,
    affected_services JSONB DEFAULT '[]'::jsonb,
    region TEXT,
    source_api TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_summary TEXT,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monitoring Runs Table
CREATE TABLE IF NOT EXISTS monitoring_runs_ms2024 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_ms INTEGER,
    alerts_found INTEGER DEFAULT 0,
    alerts_updated INTEGER DEFAULT 0,
    alerts_resolved INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
    azure_response_time_ms INTEGER,
    m365_response_time_ms INTEGER
);

-- Alert Comments Table
CREATE TABLE IF NOT EXISTS alert_comments_ms2024 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT NOT NULL,
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

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users_ms2024 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator', 'user')) DEFAULT 'user',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE service_alerts_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_runs_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_comments_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users_ms2024 ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Public read access for alerts and monitoring data
CREATE POLICY "Public read access for alerts" ON service_alerts_ms2024 
FOR SELECT USING (true);

CREATE POLICY "Public read access for monitoring runs" ON monitoring_runs_ms2024 
FOR SELECT USING (true);

-- Service account policies (allows all operations for system)
CREATE POLICY "Service account can manage alerts" ON service_alerts_ms2024 
FOR ALL USING (true);

CREATE POLICY "Service account can manage monitoring runs" ON monitoring_runs_ms2024 
FOR ALL USING (true);

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

-- Admin policies
CREATE POLICY "Admins can view all admin records" ON admin_users_ms2024 
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM admin_users_ms2024 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_alerts_status ON service_alerts_ms2024(status);
CREATE INDEX IF NOT EXISTS idx_service_alerts_service ON service_alerts_ms2024(service_name);
CREATE INDEX IF NOT EXISTS idx_service_alerts_severity ON service_alerts_ms2024(severity);
CREATE INDEX IF NOT EXISTS idx_service_alerts_created ON service_alerts_ms2024(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_alerts_external ON service_alerts_ms2024(external_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_runs_date ON monitoring_runs_ms2024(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_comments_alert ON alert_comments_ms2024(alert_id);

-- Insert demo data
INSERT INTO service_alerts_ms2024 (
    external_id, service_name, title, severity, status, impact, 
    affected_services, region, source_api, start_time
) VALUES 
(
    'azure-demo-' || extract(epoch from now())::text,
    'azure',
    'Azure Storage Performance Issues',
    'medium',
    'monitoring',
    'Users may experience slower than normal response times when accessing blob storage in the East US region.',
    '["Azure Blob Storage", "Azure Files"]'::jsonb,
    'US East',
    'Demo Data',
    NOW() - INTERVAL '2 hours'
),
(
    'm365-demo-' || extract(epoch from now())::text,
    'microsoft365',
    'Teams Meeting Join Issues',
    'high',
    'investigating',
    'Some users are unable to join Microsoft Teams meetings. We are investigating the root cause.',
    '["Microsoft Teams", "Teams Meetings"]'::jsonb,
    'Global',
    'Demo Data',
    NOW() - INTERVAL '30 minutes'
)
ON CONFLICT (external_id) DO NOTHING;

-- Insert a monitoring run record
INSERT INTO monitoring_runs_ms2024 (
    run_at, duration_ms, alerts_found, alerts_updated, alerts_resolved, 
    errors, status, azure_response_time_ms, m365_response_time_ms
) VALUES (
    NOW(),
    1250,
    2,
    1,
    0,
    '[]'::jsonb,
    'success',
    450,
    320
);

-- Success message
SELECT 'Database setup completed successfully! ' || 
       COUNT(*) || ' demo alerts created.' as message 
FROM service_alerts_ms2024;