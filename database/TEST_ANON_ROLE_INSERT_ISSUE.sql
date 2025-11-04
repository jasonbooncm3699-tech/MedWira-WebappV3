-- =====================================================
-- TEST: ANON ROLE INSERT ISSUE
-- =====================================================
-- This script tests why having INSERT permission on anon role
-- causes problems during OAuth signup profile creation
-- =====================================================

-- TEST 1: Check current INSERT permissions for anon vs authenticated
SELECT 
    'CURRENT INSERT PERMISSIONS' as test_step,
    grantee as role_name,
    privilege_type,
    CASE 
        WHEN grantee = 'anon' AND privilege_type = 'INSERT' THEN 
            '⚠️ PROBLEM: anon can INSERT (but auth.uid() will be NULL)'
        WHEN grantee = 'authenticated' AND privilege_type = 'INSERT' THEN 
            '✅ OK: authenticated can INSERT (auth.uid() will work)'
        ELSE privilege_type || ' permission'
    END as permission_analysis
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'anon', 'service_role')
AND privilege_type = 'INSERT'
ORDER BY grantee;

-- TEST 2: Show the RLS INSERT policy details
SELECT 
    'RLS INSERT POLICY ANALYSIS' as test_step,
    policyname,
    cmd as command_type,
    roles,
    with_check as with_check_clause,
    CASE 
        WHEN with_check LIKE '%auth.uid()%' THEN 
            '⚠️ Policy requires auth.uid() = id, but anon role has auth.uid() = NULL'
        ELSE 
            'Policy check: ' || COALESCE(with_check, 'NULL')
    END as policy_issue
FROM pg_policies 
WHERE tablename = 'profiles'
AND cmd = 'INSERT';

-- TEST 3: Test what auth.uid() returns in SQL editor context
-- Note: This will be NULL because SQL editor runs as postgres role, not anon/authenticated
SELECT 
    'AUTH.UID() TEST IN SQL EDITOR' as test_step,
    current_user as current_role,
    auth.uid() as auth_uid_result,
    CASE 
        WHEN auth.uid() IS NULL THEN 
            '⚠️ auth.uid() is NULL - This is what happens for anon role during signup'
        ELSE 
            '✅ auth.uid() returns: ' || auth.uid()::text
    END as auth_uid_analysis;

-- TEST 4: Simulate what happens when anon tries to INSERT
-- (This is a logical test, not an actual INSERT attempt)
SELECT 
    'SIMULATED ANON INSERT SCENARIO' as test_step,
    'anon' as simulated_role,
    NULL::uuid as simulated_auth_uid,
    '00000000-0000-0000-0000-000000000001'::uuid as attempt_user_id,
    CASE 
        WHEN NULL::uuid = '00000000-0000-0000-0000-000000000001'::uuid THEN '✅ Would pass (but never true)'
        ELSE '❌ Would FAIL: NULL != user_id, RLS policy blocks INSERT'
    END as rls_check_result,
    'This explains why anon role INSERT fails even with permission' as explanation;

-- TEST 5: Simulate what happens when authenticated tries to INSERT
-- (This is a logical test, not an actual INSERT attempt)
SELECT 
    'SIMULATED AUTHENTICATED INSERT SCENARIO' as test_step,
    'authenticated' as simulated_role,
    '00000000-0000-0000-0000-000000000001'::uuid as simulated_auth_uid,
    '00000000-0000-0000-0000-000000000001'::uuid as attempt_user_id,
    CASE 
        WHEN '00000000-0000-0000-0000-000000000001'::uuid = '00000000-0000-0000-0000-000000000001'::uuid THEN 
            '✅ Would PASS: auth.uid() == user_id, RLS policy allows INSERT'
        ELSE 
            '❌ Would FAIL: auth.uid() != user_id'
    END as rls_check_result,
    'This explains why authenticated role INSERT works correctly' as explanation;

-- TEST 6: Check if there are any other policies that might allow anon
SELECT 
    'POLICIES THAT MIGHT AFFECT ANON' as test_step,
    policyname,
    cmd as command_type,
    roles,
    permissive,
    qual as using_clause,
    with_check as with_check_clause,
    CASE 
        WHEN 'anon' = ANY(roles::text[]) THEN 
            '⚠️ This policy applies to anon role'
        WHEN 'public' = ANY(roles::text[]) AND cmd = 'INSERT' THEN 
            '⚠️ This policy applies to public role (includes anon)'
        ELSE 
            '✅ Policy does not affect anon'
    END as anon_impact
FROM pg_policies 
WHERE tablename = 'profiles'
AND (
    'anon' = ANY(roles::text[])
    OR 'public' = ANY(roles::text[])
)
ORDER BY cmd, policyname;

-- TEST 7: Recommendation - Check what should be the correct setup
SELECT 
    'RECOMMENDED CONFIGURATION' as test_step,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'anon' 
            AND privilege_type = 'INSERT'
        ) THEN 
            '❌ PROBLEM: anon has INSERT (should be revoked)'
        ELSE 
            '✅ OK: anon does NOT have INSERT (correct)'
    END as anon_insert_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'authenticated' 
            AND privilege_type = 'INSERT'
        ) THEN 
            '✅ OK: authenticated has INSERT (correct)'
        ELSE 
            '❌ PROBLEM: authenticated does NOT have INSERT (should be granted)'
    END as authenticated_insert_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND cmd = 'INSERT' 
            AND with_check LIKE '%auth.uid()%'
        ) THEN 
            '✅ OK: INSERT policy uses auth.uid() check (correct)'
        ELSE 
            '❌ PROBLEM: INSERT policy missing auth.uid() check'
    END as insert_policy_status;

-- TEST 8: Show the actual problem scenario during OAuth signup
SELECT 
    'OAUTH SIGNUP FLOW ANALYSIS' as test_step,
    'Step 1: User clicks OAuth provider' as step_1,
    'anon role (no session)' as step_1_role,
    'auth.uid() = NULL' as step_1_auth_uid,
    
    'Step 2: OAuth callback receives code' as step_2,
    'Still anon role (before session exchange)' as step_2_role,
    'auth.uid() = NULL' as step_2_auth_uid,
    
    'Step 3: exchangeCodeForSession() creates session' as step_3,
    'Should switch to authenticated role' as step_3_role,
    'auth.uid() = user.id (after exchange)' as step_3_auth_uid,
    
    'Step 4: Profile upsert attempts' as step_4,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'anon' 
            AND privilege_type = 'INSERT'
        ) THEN 
            '⚠️ If operation runs as anon: auth.uid()=NULL != id, RLS blocks INSERT'
        ELSE 
            '✅ anon cannot INSERT (correct - RLS blocks immediately)'
    END as step_4_result,
    
    'Step 5: Expected behavior' as step_5,
    'Should run as authenticated role' as step_5_role,
    'auth.uid() = user.id matches id column, RLS allows INSERT' as step_5_result;

-- =====================================================
-- SUMMARY: Root Cause Analysis
-- =====================================================
SELECT 
    'ROOT CAUSE SUMMARY' as summary,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'anon' 
            AND privilege_type = 'INSERT'
        ) THEN 
            '🔴 CRITICAL: anon role has INSERT permission. During OAuth signup, ' ||
            'if the database operation runs as anon role (even briefly), ' ||
            'auth.uid() returns NULL, causing RLS policy WITH CHECK (auth.uid() = id) to fail.'
        ELSE 
            '✅ OK: anon role does NOT have INSERT permission. This prevents the issue.'
    END as root_cause_analysis,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'anon' 
            AND privilege_type = 'INSERT'
        ) THEN 
            'RECOMMENDATION: Run REVOKE INSERT ON public.profiles FROM anon; ' ||
            'This will prevent anon role from attempting INSERT operations that ' ||
            'will always fail due to RLS policy requirements.'
        ELSE 
            'No action needed - anon role correctly does not have INSERT permission.'
    END as recommendation;

