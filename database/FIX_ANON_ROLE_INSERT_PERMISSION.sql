-- =====================================================
-- FIX: Revoke INSERT Permission from anon Role
-- =====================================================
-- This script fixes the OAuth signup profile creation issue
-- by removing INSERT permission from anon role
-- =====================================================

-- STEP 1: Show current state BEFORE fix
SELECT 
    'BEFORE FIX - Current INSERT Permissions' as step,
    grantee as role_name,
    privilege_type,
    CASE 
        WHEN grantee = 'anon' AND privilege_type = 'INSERT' THEN 
            '⚠️ PROBLEM: anon has INSERT (will be revoked)'
        WHEN grantee = 'authenticated' AND privilege_type = 'INSERT' THEN 
            '✅ OK: authenticated has INSERT (will keep)'
        ELSE 
            privilege_type || ' permission'
    END as current_status
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'anon', 'service_role')
AND privilege_type = 'INSERT'
ORDER BY grantee;

-- STEP 2: Revoke INSERT permission from anon role
-- This is the key fix: anon should NOT have INSERT permission
-- because anon role has auth.uid() = NULL, which can't satisfy
-- the RLS policy WITH CHECK (auth.uid() = id)
REVOKE INSERT ON public.profiles FROM anon;

-- STEP 3: Ensure authenticated role has INSERT permission
-- This is critical: authenticated role has valid auth.uid()
-- so it can satisfy the RLS policy WITH CHECK (auth.uid() = id)
GRANT INSERT ON public.profiles TO authenticated;

-- STEP 4: Verify the fix - Show state AFTER fix
SELECT 
    'AFTER FIX - New INSERT Permissions' as step,
    grantee as role_name,
    privilege_type,
    CASE 
        WHEN grantee = 'anon' AND privilege_type = 'INSERT' THEN 
            '❌ STILL HAS INSERT (unexpected - check manually)'
        WHEN grantee = 'authenticated' AND privilege_type = 'INSERT' THEN 
            '✅ CORRECT: authenticated has INSERT'
        WHEN grantee = 'anon' THEN 
            '✅ CORRECT: anon does NOT have INSERT (fixed!)'
        ELSE 
            privilege_type || ' permission'
    END as new_status
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'anon', 'service_role')
AND privilege_type = 'INSERT'
ORDER BY grantee;

-- STEP 5: Verify RLS INSERT policy is correct
SELECT 
    'RLS INSERT Policy Verification' as step,
    policyname,
    cmd as command_type,
    roles,
    with_check as with_check_clause,
    CASE 
        WHEN with_check LIKE '%auth.uid()%' AND cmd = 'INSERT' THEN 
            '✅ Policy is correct: requires auth.uid() = id'
        WHEN cmd = 'INSERT' THEN 
            '⚠️ Policy exists but might need auth.uid() check'
        ELSE 
            'Other policy'
    END as policy_status
FROM pg_policies 
WHERE tablename = 'profiles'
AND cmd = 'INSERT';

-- STEP 6: Summary - Expected Final State
SELECT 
    'FIX SUMMARY' as summary,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'anon' 
            AND privilege_type = 'INSERT'
        ) THEN 
            '❌ FAILED: anon still has INSERT (unexpected)'
        ELSE 
            '✅ SUCCESS: anon does NOT have INSERT'
    END as anon_insert_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'authenticated' 
            AND privilege_type = 'INSERT'
        ) THEN 
            '✅ SUCCESS: authenticated has INSERT'
        ELSE 
            '❌ FAILED: authenticated does NOT have INSERT'
    END as authenticated_insert_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'profiles' 
            AND cmd = 'INSERT' 
            AND with_check LIKE '%auth.uid()%'
        ) THEN 
            '✅ SUCCESS: INSERT policy uses auth.uid() check'
        ELSE 
            '⚠️ WARNING: INSERT policy missing auth.uid() check'
    END as insert_policy_status,
    
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'anon' 
            AND privilege_type = 'INSERT'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
            WHERE table_name = 'profiles' 
            AND grantee = 'authenticated' 
            AND privilege_type = 'INSERT'
        ) THEN 
            '✅ FIX COMPLETE: Configuration is now correct'
        ELSE 
            '⚠️ MANUAL REVIEW NEEDED: Check results above'
    END as overall_status;

-- =====================================================
-- EXPLANATION
-- =====================================================
-- This fix solves the OAuth signup profile creation issue:
--
-- BEFORE FIX:
-- - anon role has INSERT permission
-- - During OAuth signup, operations might run as anon
-- - anon role has auth.uid() = NULL
-- - RLS policy: WITH CHECK (auth.uid() = id)
-- - NULL != user.id → Policy blocks INSERT → ❌ FAILS
--
-- AFTER FIX:
-- - anon role does NOT have INSERT permission
-- - Only authenticated role can INSERT
-- - authenticated role has valid auth.uid() = user.id
-- - RLS policy: WITH CHECK (auth.uid() = id)
-- - user.id == user.id → Policy allows INSERT → ✅ WORKS
--
-- The key insight: Only authenticated users should be able
-- to INSERT their own profiles, because only they have a
-- valid auth.uid() that matches their user ID.
-- =====================================================

SELECT '✅ Fix script completed! Review the summary above.' as completion_message;

