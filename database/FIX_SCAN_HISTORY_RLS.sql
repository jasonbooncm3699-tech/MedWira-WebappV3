-- Fix scan_history RLS policies for service role access
-- This allows service role to insert scan history records

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own scan history" ON scan_history;
DROP POLICY IF EXISTS "Users can insert own scan history" ON scan_history;

-- Create new policies that allow service role access
CREATE POLICY "Users can view own scan history" ON scan_history
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can insert own scan history" ON scan_history
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Also add update and delete policies for completeness
CREATE POLICY "Users can update own scan history" ON scan_history
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can delete own scan history" ON scan_history
  FOR DELETE USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'scan_history';
