-- =====================================================
-- DIAGNOSE USER DELETION ISSUE
-- =====================================================
-- This script diagnoses the actual cause of user deletion failures
-- by identifying which tables exist and reference auth.users(id)
-- =====================================================

-- =====================================================
-- STEP 1: CHECK WHICH TABLES EXIST IN PUBLIC SCHEMA
-- =====================================================

SELECT 
    'EXISTING TABLES IN PUBLIC SCHEMA' as step,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- STEP 2: CHECK FOR USER-RELATED TABLES
-- =====================================================

SELECT 
    'USER-RELATED TABLES' as step,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (table_name LIKE '%user%' 
       OR table_name LIKE '%profile%' 
       OR table_name LIKE '%scan%'
       OR table_name LIKE '%history%')
ORDER BY table_name;

-- =====================================================
-- STEP 3: FIND ALL FOREIGN KEY CONSTRAINTS REFERENCING auth.users
-- =====================================================

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
-- STEP 4: CHECK FOR COLUMNS THAT MIGHT REFERENCE auth.users
-- =====================================================

SELECT 
    'COLUMNS THAT MIGHT REFERENCE auth.users' as step,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND (column_name LIKE '%user%' 
       OR column_name = 'id'
       OR data_type = 'uuid')
ORDER BY table_name, column_name;

-- =====================================================
-- STEP 5: CHECK FOR ORPHANED RECORDS IN EXISTING TABLES
-- =====================================================

-- Check if there are any tables with user_id columns that might have orphaned records
DO $$
DECLARE
    table_record RECORD;
    query_text TEXT;
    result_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Checking for orphaned records in tables with user_id columns...';
    
    FOR table_record IN
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND column_name = 'user_id'
          AND data_type = 'uuid'
    LOOP
        query_text := 'SELECT COUNT(*) FROM public.' || table_record.table_name || 
                     ' WHERE user_id NOT IN (SELECT id FROM auth.users)';
        
        EXECUTE query_text INTO result_count;
        
        IF result_count > 0 THEN
            RAISE NOTICE '⚠️ Found % orphaned records in table: %', result_count, table_record.table_name;
        ELSE
            RAISE NOTICE '✅ No orphaned records in table: %', table_record.table_name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- STEP 6: SHOW CURRENT USERS
-- =====================================================

SELECT 
    'CURRENT USERS IN auth.users' as step,
    id,
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email LIKE '%test%' THEN '🧪 TEST USER'
        WHEN email LIKE '%example%' THEN '📝 EXAMPLE USER'
        WHEN email LIKE '%debug%' THEN '🐛 DEBUG USER'
        WHEN email LIKE '%manual%' THEN '🔧 MANUAL USER'
        ELSE '👤 REGULAR USER'
    END as user_type
FROM auth.users 
ORDER BY created_at DESC
LIMIT 15;

-- =====================================================
-- STEP 7: ATTEMPT TO DELETE THE SPECIFIC USER
-- =====================================================

-- Try to delete the user and see what error we get
DO $$
DECLARE
    user_exists BOOLEAN;
    error_message TEXT;
BEGIN
    RAISE NOTICE '🧪 Attempting to delete user: 9638969c-b98c-4ff0-8fe0-1dbde5abdc0c';
    
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c') INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE '✅ User exists in auth.users';
        
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
-- FINAL DIAGNOSIS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'DIAGNOSIS COMPLETED';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'The error "relation public.user_profiles does not exist"';
    RAISE NOTICE 'indicates that the user_profiles table has not been created.';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Check the results above to see which tables exist';
    RAISE NOTICE '2. Identify which tables are blocking user deletion';
    RAISE NOTICE '3. Either create the missing tables or fix existing constraints';
    RAISE NOTICE '=====================================================';
END $$;
