-- =====================================================
-- COMPREHENSIVE DIAGNOSTIC: Profiles Table RLS Issue
-- =====================================================
-- Run this in Supabase SQL Editor to diagnose the permission issue
-- Share the results to identify the root cause
-- =====================================================

-- STEP 1: Check if RLS is enabled on profiles table
SELECT 
    'RLS STATUS CHECK' as diagnostic_step,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- STEP 2: List ALL RLS policies on profiles table
SELECT 
    'ALL RLS POLICIES' as diagnostic_step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command_type,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- STEP 3: Check if INSERT policy exists and its details
SELECT 
    'INSERT POLICY DETAILS' as diagnostic_step,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check,
    CASE 
        WHEN cmd = 'INSERT' AND with_check LIKE '%auth.uid()%' THEN '✅ Policy looks correct'
        WHEN cmd = 'INSERT' THEN '⚠️ Policy exists but might be missing auth.uid() check'
        ELSE '❌ No INSERT policy found'
    END as policy_validation
FROM pg_policies 
WHERE tablename = 'profiles'
AND cmd = 'INSERT';

-- STEP 4: Check table permissions (GRANT statements)
SELECT 
    'TABLE PERMISSIONS' as diagnostic_step,
    grantee as role_name,
    privilege_type,
    is_grantable,
    CASE 
        WHEN privilege_type = 'INSERT' AND grantee = 'authenticated' THEN '✅ INSERT granted to authenticated'
        WHEN privilege_type = 'INSERT' THEN '⚠️ INSERT granted to other role'
        ELSE privilege_type
    END as permission_status
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'anon', 'service_role')
ORDER BY grantee, privilege_type;

-- STEP 5: Check table ownership
SELECT 
    'TABLE OWNERSHIP' as diagnostic_step,
    schemaname,
    tablename,
    tableowner,
    CASE 
        WHEN tableowner = 'postgres' THEN '✅ Owned by postgres (expected)'
        ELSE '⚠️ Owned by ' || tableowner
    END as ownership_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- STEP 6: Check if there are any conflicting constraints or triggers
SELECT 
    'CONSTRAINTS & TRIGGERS' as diagnostic_step,
    'Constraint' as object_type,
    conname as object_name,
    contype as constraint_type,
    CASE 
        WHEN contype = 'f' THEN 'Foreign Key'
        WHEN contype = 'p' THEN 'Primary Key'
        WHEN contype = 'u' THEN 'Unique'
        ELSE contype::text
    END as constraint_description
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass
UNION ALL
SELECT 
    'CONSTRAINTS & TRIGGERS' as diagnostic_step,
    'Trigger' as object_type,
    tgname as object_name,
    '' as constraint_type,
    'Trigger exists' as constraint_description
FROM pg_trigger 
WHERE tgrelid = 'public.profiles'::regclass
AND tgisinternal = false;

-- STEP 7: Test auth.uid() function availability
-- This will show if auth.uid() is accessible (might return null if no session)
SELECT 
    'AUTH.UID() TEST' as diagnostic_step,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN '⚠️ auth.uid() returns NULL - no session context'
        ELSE '✅ auth.uid() returns: ' || auth.uid()::text
    END as auth_status;

-- STEP 8: Check column structure (especially referred_by type)
SELECT 
    'COLUMN STRUCTURE' as diagnostic_step,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    CASE 
        WHEN column_name = 'referred_by' AND data_type = 'uuid' THEN '✅ Correct type (UUID)'
        WHEN column_name = 'referred_by' THEN '❌ Wrong type: ' || data_type
        WHEN column_name = 'tokens' AND data_type = 'integer' THEN '✅ Correct type'
        WHEN column_name = 'tokens' THEN '⚠️ Type: ' || data_type
        ELSE ''
    END as validation
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- STEP 9: Count existing profiles (for reference)
SELECT 
    'EXISTING DATA' as diagnostic_step,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT id) as unique_user_ids,
    COUNT(CASE WHEN referred_by IS NOT NULL THEN 1 END) as profiles_with_referrer
FROM public.profiles;

-- STEP 10: Check default privileges for authenticated role
SELECT 
    'DEFAULT PRIVILEGES' as diagnostic_step,
    grantee,
    privilege_type,
    object_type,
    object_schema
FROM information_schema.default_privileges
WHERE grantee = 'authenticated'
AND object_schema = 'public'
AND object_name = 'profiles'
ORDER BY privilege_type;

-- =====================================================
-- SUMMARY CHECKLIST
-- =====================================================
SELECT 
    'SUMMARY CHECKLIST' as summary,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true
        ) THEN '✅ RLS is enabled'
        ELSE '❌ RLS is NOT enabled'
    END as rls_enabled_check,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' AND cmd = 'INSERT'
        ) THEN '✅ INSERT policy exists'
        ELSE '❌ INSERT policy is MISSING'
    END as insert_policy_check,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'authenticated' 
            AND privilege_type = 'INSERT'
        ) THEN '✅ INSERT granted to authenticated'
        ELSE '❌ INSERT NOT granted to authenticated'
    END as insert_permission_check,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND cmd = 'INSERT' 
            AND with_check LIKE '%auth.uid()%'
        ) THEN '✅ INSERT policy uses auth.uid()'
        ELSE '❌ INSERT policy missing auth.uid() check'
    END as auth_uid_check;

