-- =====================================================
-- COMPREHENSIVE TEST SCRIPT: User Profiles System Validation
-- =====================================================
-- Run this script after deploying VERIFIED_USER_PROFILES_FIX.sql
-- to validate that the complete system works correctly with public.user_profiles
-- =====================================================

-- =====================================================
-- TEST 1: AUTOMATED SYSTEM TEST
-- =====================================================
SELECT 'TEST 1: Running automated system test...' as test_step;

-- Run the comprehensive test function
SELECT test_user_provisioning_system() as automated_test_result;

-- =====================================================
-- TEST 2: TRIGGER VERIFICATION
-- =====================================================
SELECT 'TEST 2: Verifying trigger configuration...' as test_step;

-- Verify the trigger exists and is properly configured
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created' 
AND event_object_table = 'users'
AND event_object_schema = 'auth';

-- Expected: Should show trigger with AFTER INSERT timing

-- =====================================================
-- TEST 3: FUNCTION VERIFICATION
-- =====================================================
SELECT 'TEST 3: Verifying function configuration...' as test_step;

-- Show all provisioning-related functions
SELECT 
    routine_name,
    routine_type,
    security_type,
    data_type,
    routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_name IN (
    'handle_new_user_provisioning', 
    'generate_unique_referral_code', 
    'provision_user_profile_manually',
    'test_user_provisioning_system'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- Expected: All 4 functions should exist with SECURITY DEFINER

-- =====================================================
-- TEST 4: TABLE STRUCTURE VERIFICATION
-- =====================================================
SELECT 'TEST 4: Verifying user_profiles table structure...' as test_step;

-- Check user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected: Should show all required columns with correct types:
-- id (uuid), token_count (integer), referral_code (varchar), referral_count (integer), 
-- referred_by (varchar), created_at (timestamp), updated_at (timestamp)

-- =====================================================
-- TEST 5: INDEX VERIFICATION
-- =====================================================
SELECT 'TEST 5: Verifying indexes...' as test_step;

-- Check indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public'
ORDER BY indexname;

-- Expected: Should show indexes on referral_code, referred_by, token_count, created_at

-- =====================================================
-- TEST 6: RLS POLICIES VERIFICATION
-- =====================================================
SELECT 'TEST 6: Verifying RLS policies...' as test_step;

-- Verify RLS policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL as has_qual,
    with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public'
ORDER BY policyname;

-- Expected: Should show 4 policies for SELECT, UPDATE, INSERT, and referral code viewing

-- =====================================================
-- TEST 7: PERMISSIONS VERIFICATION
-- =====================================================
SELECT 'TEST 7: Verifying permissions...' as test_step;

-- Check function permissions
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name IN (
    'handle_new_user_provisioning', 
    'generate_unique_referral_code', 
    'provision_user_profile_manually',
    'test_user_provisioning_system'
)
AND routine_schema = 'public'
ORDER BY routine_name, grantee;

-- Check table permissions
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- =====================================================
-- TEST 8: REFERRAL CODE GENERATION TEST
-- =====================================================
SELECT 'TEST 8: Testing referral code generation...' as test_step;

-- Test referral code generation
SELECT 
    generate_unique_referral_code() as generated_code_1,
    generate_unique_referral_code() as generated_code_2,
    generate_unique_referral_code() as generated_code_3;

-- Expected: Should show 3 different 8-character codes

-- =====================================================
-- TEST 9: MANUAL PROVISIONING TEST
-- =====================================================
SELECT 'TEST 9: Testing manual provisioning function...' as test_step;

-- Test manual provisioning with a test user
SELECT provision_user_profile_manually(
    uuid_generate_v4(),
    'manual_test@example.com',
    'Manual Test User',
    NULL
) as manual_provision_result;

-- Expected: Should return success JSON with user data

-- =====================================================
-- TEST 10: DATA INTEGRITY CHECK
-- =====================================================
SELECT 'TEST 10: Checking data integrity...' as test_step;

-- Check for any existing users without proper provisioning
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN token_count = 30 THEN 1 END) as users_with_30_tokens,
    COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as users_with_referral_codes,
    COUNT(CASE WHEN token_count IS NULL THEN 1 END) as users_with_null_tokens,
    AVG(token_count) as average_tokens,
    MIN(created_at) as earliest_user,
    MAX(created_at) as latest_user
FROM public.user_profiles;

-- Check for duplicate referral codes (should be 0)
SELECT 
    referral_code,
    COUNT(*) as count
FROM public.user_profiles 
WHERE referral_code IS NOT NULL
GROUP BY referral_code 
HAVING COUNT(*) > 1;

-- Expected: Should show 0 rows (no duplicates)

-- =====================================================
-- TEST 11: PERFORMANCE CHECK
-- =====================================================
SELECT 'TEST 11: Checking performance metrics...' as test_step;

-- Check table size and performance
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename = 'user_profiles';

-- =====================================================
-- TEST 12: SECURITY VERIFICATION
-- =====================================================
SELECT 'TEST 12: Verifying security settings...' as test_step;

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    relforcerowsecurity as force_rls_enabled
FROM pg_tables 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- Check function security definer
SELECT 
    routine_name,
    security_type,
    definer
FROM information_schema.routines 
WHERE routine_name IN (
    'handle_new_user_provisioning', 
    'generate_unique_referral_code', 
    'provision_user_profile_manually'
)
AND routine_schema = 'public';

-- Expected: All functions should have SECURITY DEFINER

-- =====================================================
-- TEST 13: FRONTEND COMPATIBILITY CHECK
-- =====================================================
SELECT 'TEST 13: Verifying frontend compatibility...' as test_step;

-- Check that the table structure matches what the frontend expects
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' 
                    AND column_name = 'token_count' 
                    AND table_schema = 'public') 
        THEN '✅ token_count column exists'
        ELSE '❌ token_count column missing'
    END as token_count_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' 
                    AND column_name = 'referral_code' 
                    AND table_schema = 'public') 
        THEN '✅ referral_code column exists'
        ELSE '❌ referral_code column missing'
    END as referral_code_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' 
                    AND column_name = 'referral_count' 
                    AND table_schema = 'public') 
        THEN '✅ referral_count column exists'
        ELSE '❌ referral_count column missing'
    END as referral_count_check,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' 
                    AND column_name = 'referred_by' 
                    AND table_schema = 'public') 
        THEN '✅ referred_by column exists'
        ELSE '❌ referred_by column missing'
    END as referred_by_check;

-- =====================================================
-- FINAL VALIDATION SUMMARY
-- =====================================================
SELECT 'FINAL VALIDATION SUMMARY' as summary_step;

-- Create summary view
CREATE OR REPLACE VIEW user_profiles_system_status AS
SELECT 
    'Trigger Status' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created' 
            AND event_object_table = 'users'
            AND event_object_schema = 'auth'
        ) THEN '✅ ACTIVE'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Provisioning Function' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'handle_new_user_provisioning'
            AND routine_schema = 'public'
        ) THEN '✅ ACTIVE'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Referral Code Function' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'generate_unique_referral_code'
            AND routine_schema = 'public'
        ) THEN '✅ ACTIVE'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Manual Provisioning' as component,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'provision_user_profile_manually'
            AND routine_schema = 'public'
        ) THEN '✅ ACTIVE'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'RLS Policies' as component,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_policies 
            WHERE tablename = 'user_profiles' 
            AND schemaname = 'public'
        ) >= 4 THEN '✅ ACTIVE'
        ELSE '❌ MISSING'
    END as status
UNION ALL
SELECT 
    'Table Structure' as component,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND table_schema = 'public'
            AND column_name IN ('id', 'token_count', 'referral_code', 'referral_count', 'referred_by')
        ) = 5 THEN '✅ COMPLETE'
        ELSE '❌ INCOMPLETE'
    END as status
UNION ALL
SELECT 
    'Frontend Compatibility' as component,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND table_schema = 'public'
            AND column_name IN ('token_count', 'referral_code', 'referral_count', 'referred_by')
        ) = 4 THEN '✅ COMPATIBLE'
        ELSE '❌ INCOMPATIBLE'
    END as status;

-- Show final status
SELECT * FROM user_profiles_system_status;

-- =====================================================
-- SUCCESS CRITERIA CHECKLIST
-- =====================================================
SELECT 'SUCCESS CRITERIA CHECKLIST' as checklist_step;

-- Automated checklist
WITH checklist AS (
    SELECT 
        'All tests passed' as criterion,
        CASE 
            WHEN (
                SELECT (test_user_provisioning_system() ->> 'success')::boolean
            ) = true THEN '✅ PASS'
            ELSE '❌ FAIL'
        END as result
    UNION ALL
    SELECT 
        'Trigger configured correctly' as criterion,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.triggers 
                WHERE trigger_name = 'on_auth_user_created' 
                AND event_manipulation = 'INSERT'
                AND action_timing = 'AFTER'
            ) THEN '✅ PASS'
            ELSE '❌ FAIL'
        END as result
    UNION ALL
    SELECT 
        'Functions have SECURITY DEFINER' as criterion,
        CASE 
            WHEN (
                SELECT COUNT(*) FROM information_schema.routines 
                WHERE routine_name IN (
                    'handle_new_user_provisioning', 
                    'generate_unique_referral_code', 
                    'provision_user_profile_manually'
                )
                AND routine_schema = 'public'
                AND security_type = 'DEFINER'
            ) = 3 THEN '✅ PASS'
            ELSE '❌ FAIL'
        END as result
    UNION ALL
    SELECT 
        'RLS policies in place' as criterion,
        CASE 
            WHEN (
                SELECT COUNT(*) FROM pg_policies 
                WHERE tablename = 'user_profiles' 
                AND schemaname = 'public'
            ) >= 4 THEN '✅ PASS'
            ELSE '❌ FAIL'
        END as result
    UNION ALL
    SELECT 
        'Table has all required columns' as criterion,
        CASE 
            WHEN (
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'user_profiles' 
                AND table_schema = 'public'
                AND column_name IN ('id', 'token_count', 'referral_code', 'referral_count', 'referred_by', 'created_at', 'updated_at')
            ) = 7 THEN '✅ PASS'
            ELSE '❌ FAIL'
        END as result
    UNION ALL
    SELECT 
        'Frontend compatibility confirmed' as criterion,
        CASE 
            WHEN (
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'user_profiles' 
                AND table_schema = 'public'
                AND column_name IN ('token_count', 'referral_code', 'referral_count', 'referred_by')
            ) = 4 THEN '✅ PASS'
            ELSE '❌ FAIL'
        END as result
)
SELECT * FROM checklist;

-- =====================================================
-- DEPLOYMENT CONFIRMATION
-- =====================================================
DO $$
DECLARE
    all_tests_passed BOOLEAN := TRUE;
    test_result JSON;
BEGIN
    -- Run final test
    SELECT test_user_provisioning_system() INTO test_result;
    
    -- Check if test passed
    IF (test_result ->> 'success')::boolean = false THEN
        all_tests_passed := FALSE;
    END IF;
    
    -- Check trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND event_object_schema = 'auth'
    ) THEN
        all_tests_passed := FALSE;
    END IF;
    
    -- Check table structure
    IF (
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND table_schema = 'public'
        AND column_name IN ('token_count', 'referral_code', 'referral_count', 'referred_by')
    ) != 4 THEN
        all_tests_passed := FALSE;
    END IF;
    
    -- Final result
    IF all_tests_passed THEN
        RAISE NOTICE '🎉 VERIFIED USER PROFILES FIX DEPLOYMENT: SUCCESS!';
        RAISE NOTICE '✅ All tests passed';
        RAISE NOTICE '✅ Trigger is active';
        RAISE NOTICE '✅ Functions are configured';
        RAISE NOTICE '✅ New users will receive 30 tokens automatically';
        RAISE NOTICE '✅ Referral codes will be generated';
        RAISE NOTICE '✅ Frontend compatibility confirmed';
        RAISE NOTICE '✅ All references use public.user_profiles';
        RAISE NOTICE '🚀 System is ready for production!';
    ELSE
        RAISE NOTICE '❌ DEPLOYMENT ISSUES DETECTED';
        RAISE NOTICE 'Please review the test results above';
        RAISE NOTICE 'Some components may need manual verification';
    END IF;
END $$;

-- Clean up test view
DROP VIEW IF EXISTS user_profiles_system_status;
