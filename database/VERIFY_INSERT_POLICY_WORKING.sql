-- =====================================================
-- VERIFY INSERT POLICY IS WORKING CORRECTLY
-- =====================================================
-- Run this AFTER the diagnostic script to verify the policy
-- =====================================================

-- Check the exact INSERT policy definition
SELECT 
    'INSERT POLICY DEFINITION' as check_type,
    policyname,
    schemaname,
    tablename,
    permissive,
    roles,
    cmd,
    qual as USING_clause,
    with_check as WITH_CHECK_clause,
    'Policy SQL would be: ' || 
    'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename ||
    ' FOR ' || cmd ||
    CASE 
        WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
        ELSE ''
    END as policy_sql_equivalent
FROM pg_policies 
WHERE tablename = 'profiles'
AND cmd = 'INSERT';

-- Verify auth.uid() is accessible (will return NULL if no session)
SELECT 
    'AUTH.UID() AVAILABILITY' as check_type,
    auth.uid() as current_uid,
    auth.jwt() ->> 'sub' as jwt_user_id,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN '✅ auth.uid() is accessible'
        WHEN auth.jwt() IS NOT NULL THEN '⚠️ JWT exists but auth.uid() is NULL'
        ELSE '❌ No auth context available (running as anonymous)'
    END as auth_context_status;

-- Check if the policy might be blocked by other policies
SELECT 
    'POLICY CONFLICTS' as check_type,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    CASE 
        WHEN COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) = 0 THEN '❌ No INSERT policy'
        WHEN COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) > 1 THEN '⚠️ Multiple INSERT policies (might conflict)'
        ELSE '✅ Single INSERT policy'
    END as policy_conflict_check
FROM pg_policies 
WHERE tablename = 'profiles';





