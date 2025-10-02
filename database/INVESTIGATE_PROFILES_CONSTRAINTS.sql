-- =====================================================
-- INVESTIGATE PROFILES TABLE CONSTRAINTS
-- =====================================================
-- This script investigates the actual constraints on the profiles table
-- to identify the correct constraint name that's blocking user deletion
-- =====================================================

-- =====================================================
-- STEP 1: SHOW ALL CONSTRAINTS ON PROFILES TABLE
-- =====================================================

-- Show all constraints on the profiles table
SELECT 
    'ALL CONSTRAINTS ON PROFILES TABLE' as step,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE ENABLED'
        ELSE '❌ CASCADE NOT ENABLED'
    END as cascade_status
FROM information_schema.table_constraints AS tc 
LEFT JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.table_name = 'profiles'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- =====================================================
-- STEP 2: SHOW TABLE STRUCTURE
-- =====================================================

-- Show the structure of the profiles table
SELECT 
    'PROFILES TABLE STRUCTURE' as step,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'profiles'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 3: FIND FOREIGN KEY CONSTRAINTS REFERENCING auth.users
-- =====================================================

-- Find all foreign key constraints that reference auth.users
SELECT 
    'FOREIGN KEY CONSTRAINTS REFERENCING auth.users' as step,
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE ENABLED'
        ELSE '❌ CASCADE NOT ENABLED'
    END as cascade_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- STEP 4: CHECK FOR ORPHANED RECORDS
-- =====================================================

-- Check for orphaned records in profiles table
SELECT 
    'ORPHANED RECORDS CHECK' as step,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN au.id IS NULL THEN 1 END) as orphaned_profiles
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- =====================================================
-- STEP 5: SHOW SAMPLE DATA
-- =====================================================

-- Show sample data from profiles table
SELECT 
    'SAMPLE PROFILES DATA' as step,
    id,
    created_at,
    updated_at
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 6: ATTEMPT USER DELETION WITH DETAILED ERROR
-- =====================================================

-- Try to delete the user and capture the exact error
DO $$
DECLARE
    user_exists BOOLEAN;
    profile_exists BOOLEAN;
    error_message TEXT;
BEGIN
    RAISE NOTICE '🧪 Attempting to delete user: 9638969c-b98c-4ff0-8fe0-1dbde5abdc0c';
    
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c') INTO user_exists;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c') INTO profile_exists;
    
    RAISE NOTICE 'User exists in auth.users: %', user_exists;
    RAISE NOTICE 'Profile exists in public.profiles: %', profile_exists;
    
    IF user_exists THEN
        -- Try to delete and catch any errors
        BEGIN
            DELETE FROM auth.users WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c';
            RAISE NOTICE '🎉 User deleted successfully!';
        EXCEPTION WHEN OTHERS THEN
            error_message := SQLERRM;
            RAISE NOTICE '❌ Error deleting user: %', error_message;
        END;
    ELSE
        RAISE NOTICE '⚠️ User does not exist in auth.users';
    END IF;
END $$;

-- =====================================================
-- STEP 7: SHOW ALL TABLES WITH USER REFERENCES
-- =====================================================

-- Show all tables that might reference users
SELECT 
    'TABLES WITH USER REFERENCES' as step,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- FINAL DIAGNOSIS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'INVESTIGATION COMPLETED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'The constraint profiles_id_fkey does not exist.';
    RAISE NOTICE 'Check the results above to find the actual constraint name.';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Identify the correct constraint name from the results';
    RAISE NOTICE '2. Drop and recreate that constraint with CASCADE';
    RAISE NOTICE '3. Test user deletion again';
    RAISE NOTICE '=====================================================';
END $$;
