-- Admin Panel Setup for Microsoft Service Health Dashboard
-- Run this SQL in your Supabase SQL Editor to create admin users

-- First, create the admin users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'moderator', 'user')) DEFAULT 'user',
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Enhanced user profiles table for admin management
CREATE TABLE IF NOT EXISTS user_profiles_enhanced_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  phone TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  notification_email TEXT,
  timezone TEXT DEFAULT 'UTC',
  avatar_url TEXT,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspended_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by UUID REFERENCES auth.users(id),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- File uploads table
CREATE TABLE IF NOT EXISTS file_uploads_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  upload_type TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs_ms2024 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users overview view
CREATE OR REPLACE VIEW admin_users_overview AS
SELECT 
  au.id as auth_id,
  au.email,
  au.email_confirmed_at,
  au.last_sign_in_at,
  au.created_at as registered_at,
  COALESCE(upe.display_name, split_part(au.email, '@', 1)) as display_name,
  upe.avatar_url,
  upe.location,
  upe.phone,
  upe.is_suspended,
  upe.suspended_reason,
  upe.suspended_at,
  COALESCE(admin_u.role, 'user') as role,
  CASE 
    WHEN admin_u.role IS NOT NULL AND admin_u.role != 'user' THEN true 
    ELSE false 
  END as is_admin,
  CASE 
    WHEN au.last_sign_in_at IS NOT NULL THEN true 
    ELSE false 
  END as is_active
FROM auth.users au
LEFT JOIN user_profiles_enhanced_ms2024 upe ON au.id = upe.user_id
LEFT JOIN admin_users_ms2024 admin_u ON au.id = admin_u.user_id
ORDER BY au.created_at DESC;

-- Enable RLS
ALTER TABLE admin_users_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles_enhanced_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads_ms2024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs_ms2024 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin tables
CREATE POLICY "Admins can view all admin records" ON admin_users_ms2024 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users_ms2024 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Super admins can manage admin records" ON admin_users_ms2024 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users_ms2024 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Enhanced user profiles policies
CREATE POLICY "Users can manage own enhanced profiles" ON user_profiles_enhanced_ms2024 
FOR ALL TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enhanced profiles" ON user_profiles_enhanced_ms2024 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users_ms2024 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);

CREATE POLICY "Admins can manage enhanced profiles" ON user_profiles_enhanced_ms2024 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users_ms2024 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- File upload policies
CREATE POLICY "Users can manage own files" ON file_uploads_ms2024 
FOR ALL TO authenticated 
USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY "Users can view own activity" ON user_activity_logs_ms2024 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON user_activity_logs_ms2024 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM admin_users_ms2024 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);

CREATE POLICY "System can log activity" ON user_activity_logs_ms2024 
FOR INSERT TO authenticated 
WITH CHECK (true);

-- Storage bucket for user files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-files', 'user-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own files" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own files" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own files" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Function to automatically create admin user for the first user
CREATE OR REPLACE FUNCTION create_first_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    -- Make the first user a super admin
    INSERT INTO admin_users_ms2024 (user_id, role, permissions, created_by)
    VALUES (NEW.id, 'super_admin', '["all"]'::jsonb, NEW.id);
    
    -- Create enhanced profile
    INSERT INTO user_profiles_enhanced_ms2024 (user_id, display_name, notification_email)
    VALUES (NEW.id, split_part(NEW.email, '@', 1), NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create admin for first user
DROP TRIGGER IF EXISTS create_first_admin_trigger ON auth.users;
CREATE TRIGGER create_first_admin_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_first_admin();

-- Function to manually promote a user to admin (run this to make yourself admin)
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email TEXT, admin_role TEXT DEFAULT 'admin')
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
  result_message TEXT;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'User not found with email: ' || user_email;
  END IF;
  
  -- Insert or update admin role
  INSERT INTO admin_users_ms2024 (user_id, role, permissions)
  VALUES (target_user_id, admin_role, '["user_management", "system_settings"]'::jsonb)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = admin_role,
    permissions = '["user_management", "system_settings"]'::jsonb,
    updated_at = NOW();
  
  -- Create enhanced profile if it doesn't exist
  INSERT INTO user_profiles_enhanced_ms2024 (user_id, display_name, notification_email)
  VALUES (target_user_id, split_part(user_email, '@', 1), user_email)
  ON CONFLICT (user_id) DO NOTHING;
  
  result_message := 'Successfully promoted ' || user_email || ' to ' || admin_role;
  RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Promote yourself to admin (replace with your email)
-- SELECT promote_user_to_admin('your-email@example.com', 'super_admin');