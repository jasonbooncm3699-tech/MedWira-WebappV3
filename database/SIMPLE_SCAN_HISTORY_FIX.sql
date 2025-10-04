-- Simple fix for scan_history RLS policy
-- Temporarily disable RLS for service role operations

-- First, let's see what policies exist
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'scan_history';

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own scan history" ON scan_history;
DROP POLICY IF EXISTS "Users can insert own scan history" ON scan_history;
DROP POLICY IF EXISTS "Users can update own scan history" ON scan_history;
DROP POLICY IF EXISTS "Users can delete own scan history" ON scan_history;

-- Create a simple policy that allows service role to do everything
CREATE POLICY "Service role full access" ON scan_history
  FOR ALL USING (auth.role() = 'service_role');

-- Also allow authenticated users to access their own data
CREATE POLICY "Users own data access" ON scan_history
  FOR ALL USING (auth.uid() = user_id);

-- Verify the new policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'scan_history';
