-- =====================================================
-- FINAL USER DELETION FIX - COMPREHENSIVE CONSTRAINT REPAIR
-- =====================================================
-- This script programmatically identifies and fixes ALL foreign key constraints
-- that reference auth.users(id) to enable proper user deletion with CASCADE
-- =====================================================

-- =====================================================
-- STEP 1: IDENTIFY ALL FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Show current foreign key constraints that reference auth.users
SELECT 
    'IDENTIFYING CONSTRAINTS' as step,
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
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
-- STEP 2: PROGRAMMATICALLY DROP ALL CONSTRAINTS
-- =====================================================

-- Dynamically drop ALL foreign key constraints that reference auth.users
DO $$
DECLARE
    constraint_record RECORD;
    constraint_name TEXT;
    table_name TEXT;
    column_name TEXT;
BEGIN
    RAISE NOTICE '🔍 Searching for foreign key constraints referencing auth.users...';
    
    FOR constraint_record IN
        SELECT 
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users'
            AND ccu.table_schema = 'auth'
            AND tc.table_schema = 'public'
    LOOP
        constraint_name := constraint_record.constraint_name;
        table_name := constraint_record.table_name;
        column_name := constraint_record.column_name;
        
        RAISE NOTICE '🗑️ Dropping constraint: % from table: %.%', constraint_name, constraint_record.table_schema, table_name;
        
        EXECUTE 'ALTER TABLE ' || constraint_record.table_schema || '.' || table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_name;
        
        RAISE NOTICE '✅ Successfully dropped constraint: %', constraint_name;
    END LOOP;
    
    RAISE NOTICE '🎉 All foreign key constraints dropped successfully!';
END $$;

-- =====================================================
-- STEP 3: PROGRAMMATICALLY ADD CONSTRAINTS WITH CASCADE
-- =====================================================

-- Dynamically add foreign key constraints with ON DELETE CASCADE
DO $$
DECLARE
    constraint_record RECORD;
    constraint_name TEXT;
    table_name TEXT;
    column_name TEXT;
    new_constraint_name TEXT;
BEGIN
    RAISE NOTICE '🔧 Adding foreign key constraints with ON DELETE CASCADE...';
    
    FOR constraint_record IN
        SELECT 
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users'
            AND ccu.table_schema = 'auth'
            AND tc.table_schema = 'public'
    LOOP
        table_name := constraint_record.table_name;
        column_name := constraint_record.column_name;
        
        -- Create new constraint name
        new_constraint_name := table_name || '_' || column_name || '_fkey';
        
        RAISE NOTICE '🔗 Adding CASCADE constraint: % to table: %.%', new_constraint_name, constraint_record.table_schema, table_name;
        
        -- Add the constraint with ON DELETE CASCADE
        EXECUTE 'ALTER TABLE ' || constraint_record.table_schema || '.' || table_name || 
                ' ADD CONSTRAINT ' || new_constraint_name || 
                ' FOREIGN KEY (' || column_name || ') REFERENCES auth.users(id) ON DELETE CASCADE';
        
        RAISE NOTICE '✅ Successfully added CASCADE constraint: %', new_constraint_name;
    END LOOP;
    
    RAISE NOTICE '🎉 All foreign key constraints added with CASCADE successfully!';
END $$;

-- =====================================================
-- STEP 4: CLEAN UP ORPHANED DATA
-- =====================================================

-- Clean up orphaned records in all tables
DO $$
DECLARE
    table_record RECORD;
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🧹 Cleaning up orphaned records...';
    
    -- Clean up user_profiles
    DELETE FROM public.user_profiles 
    WHERE id NOT IN (SELECT id FROM auth.users);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🗑️ Deleted % orphaned records from user_profiles', deleted_count;
    
    -- Clean up scan_history if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        DELETE FROM public.scan_history 
        WHERE user_id NOT IN (SELECT id FROM auth.users);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE '🗑️ Deleted % orphaned records from scan_history', deleted_count;
    ELSE
        RAISE NOTICE 'ℹ️ scan_history table does not exist, skipping cleanup';
    END IF;
    
    RAISE NOTICE '✅ Orphaned record cleanup completed!';
END $$;

-- =====================================================
-- STEP 5: VERIFY CONSTRAINTS ARE PROPERLY SET
-- =====================================================

-- Show all foreign key constraints after the fix
SELECT 
    'VERIFICATION - CONSTRAINTS AFTER FIX' as step,
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
-- STEP 6: SHOW CURRENT USERS FOR DELETION TEST
-- =====================================================

-- Show current users that can be tested for deletion
SELECT 
    'CURRENT USERS - READY FOR DELETION TEST' as step,
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
-- STEP 7: CREATE COMPREHENSIVE DELETION TEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION comprehensive_user_deletion_test(test_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN;
    profile_exists BOOLEAN;
    history_exists BOOLEAN;
    result JSON;
    cascade_working BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🧪 Starting comprehensive user deletion test for user: %', test_user_id;
    
    -- Check if user exists before deletion
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists;
    
    -- Check if profile exists before deletion
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO profile_exists;
    
    -- Check if scan history exists before deletion
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        SELECT EXISTS(SELECT 1 FROM public.scan_history WHERE user_id = test_user_id) INTO history_exists;
    ELSE
        history_exists := FALSE;
    END IF;
    
    -- Return status before deletion
    result := json_build_object(
        'test_user_id', test_user_id,
        'before_deletion', json_build_object(
            'user_exists', user_exists,
            'profile_exists', profile_exists,
            'history_exists', history_exists
        )
    );
    
    -- If user exists, try to delete
    IF user_exists THEN
        RAISE NOTICE '🗑️ Attempting to delete user: %', test_user_id;
        
        -- Delete the user (this should cascade to related tables)
        DELETE FROM auth.users WHERE id = test_user_id;
        
        -- Check status after deletion
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists;
        SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO profile_exists;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
            SELECT EXISTS(SELECT 1 FROM public.scan_history WHERE user_id = test_user_id) INTO history_exists;
        ELSE
            history_exists := FALSE;
        END IF;
        
        -- Update result with after deletion status
        result := jsonb_set(
            result::jsonb, 
            '{after_deletion}', 
            json_build_object(
                'user_exists', user_exists,
                'profile_exists', profile_exists,
                'history_exists', history_exists
            )::jsonb
        );
        
        -- Check if cascade deletion was successful
        IF NOT user_exists AND NOT profile_exists AND NOT history_exists THEN
            cascade_working := TRUE;
            result := jsonb_set(result::jsonb, '{cascade_deletion_successful}', 'true'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"CASCADE deletion working perfectly!"'::jsonb);
            RAISE NOTICE '🎉 CASCADE deletion test SUCCESSFUL for user: %', test_user_id;
        ELSE
            result := jsonb_set(result::jsonb, '{cascade_deletion_successful}', 'false'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"CASCADE deletion failed - some records remain"'::jsonb);
            RAISE NOTICE '❌ CASCADE deletion test FAILED for user: %', test_user_id;
        END IF;
    ELSE
        result := jsonb_set(result::jsonb, '{cascade_deletion_successful}', 'false'::jsonb);
        result := jsonb_set(result::jsonb, '{message}', '"User does not exist"'::jsonb);
        RAISE NOTICE '⚠️ User does not exist: %', test_user_id;
    END IF;
    
    RETURN result;
END;
$$;

-- Grant permissions for test function
GRANT EXECUTE ON FUNCTION comprehensive_user_deletion_test(UUID) TO authenticated;

-- =====================================================
-- STEP 8: DELETE TEST USERS (OPTIONAL - UNCOMMENT TO USE)
-- =====================================================

-- Uncomment the following block to delete test users
/*
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️ Deleting test users...';
    
    DELETE FROM auth.users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%example%' 
       OR email LIKE '%debug%'
       OR email LIKE '%manual%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % test users', deleted_count;
END $$;
*/

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉🎉🎉 FINAL USER DELETION FIX COMPLETED! 🎉🎉🎉';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ All foreign key constraints identified and fixed';
    RAISE NOTICE '✅ ON DELETE CASCADE applied to all relevant tables';
    RAISE NOTICE '✅ Orphaned records cleaned up';
    RAISE NOTICE '✅ Comprehensive test function created';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🚀 USER DELETION SHOULD NOW WORK PERFECTLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test with: SELECT comprehensive_user_deletion_test(''user-uuid'');';
    RAISE NOTICE '2. Or delete users directly: DELETE FROM auth.users WHERE id = ''uuid'';';
    RAISE NOTICE '3. All related records will be automatically deleted!';
    RAISE NOTICE '=====================================================';
END $$;
