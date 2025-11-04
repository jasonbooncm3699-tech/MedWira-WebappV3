-- =====================================================
-- ROLLBACK: Restore INSERT Permission to anon Role
-- =====================================================
-- ONLY USE THIS if you need to revert the fix
-- This restores the previous (broken) state
-- =====================================================

-- Restore INSERT permission to anon role
-- WARNING: This will bring back the original problem!
GRANT INSERT ON public.profiles TO anon;

-- Verify rollback
SELECT 
    'ROLLBACK COMPLETE' as status,
    grantee as role_name,
    privilege_type,
    CASE 
        WHEN grantee = 'anon' AND privilege_type = 'INSERT' THEN 
            '⚠️ ROLLED BACK: anon now has INSERT again (problem will return)'
        WHEN grantee = 'authenticated' AND privilege_type = 'INSERT' THEN 
            '✅ authenticated still has INSERT'
        ELSE 
            privilege_type || ' permission'
    END as rollback_status
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'anon', 'service_role')
AND privilege_type = 'INSERT'
ORDER BY grantee;

SELECT '⚠️ Rollback completed. Original problem will return.' as warning;


