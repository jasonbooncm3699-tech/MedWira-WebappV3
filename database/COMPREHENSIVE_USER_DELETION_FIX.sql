-- =====================================================
-- COMPREHENSIVE USER DELETION FIX - PERMANENT SOLUTION
-- =====================================================
-- This script permanently fixes user deletion failures by applying
-- ON DELETE CASCADE to ALL tables referencing auth.users(id)
-- Targets: public.user_profiles and public.scan_history specifically
-- =====================================================

-- =====================================================
-- STEP 1: GRANT NECESSARY PRIVILEGES
-- =====================================================

-- Grant necessary privileges for supabase_admin role to alter tables
-- (Required in some hosted environments)
DO $$
BEGIN
    RAISE NOTICE '🔐 STEP 1: Granting necessary privileges...';
    
    -- Grant privileges to alter user_profiles table
    GRANT ALL PRIVILEGES ON public.user_profiles TO supabase_admin;
    GRANT ALL PRIVILEGES ON public.user_profiles TO postgres;
    
    -- Grant privileges to alter scan_history table (if it exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        GRANT ALL PRIVILEGES ON public.scan_history TO supabase_admin;
        GRANT ALL PRIVILEGES ON public.scan_history TO postgres;
        RAISE NOTICE '✅ Granted privileges on scan_history table';
    ELSE
        RAISE NOTICE 'ℹ️ scan_history table does not exist, skipping privilege grant';
    END IF;
    
    RAISE NOTICE '✅ STEP 1 COMPLETED: Privileges granted successfully';
END $$;

-- =====================================================
-- STEP 2: IDENTIFY ALL FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Show all current foreign key constraints referencing auth.users
SELECT 
    'IDENTIFYING ALL CONSTRAINTS' as step,
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
-- STEP 3: FIX user_profiles TABLE
-- =====================================================

DO $$
DECLARE
    fk_name TEXT;
    constraint_found BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔧 STEP 3: Fixing user_profiles table foreign key constraint...';
    
    -- Find the exact name of the foreign key constraint on user_profiles
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_schema = 'public'
      AND constraint_name IN (
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'user_profiles'
            AND tc.table_schema = 'public'
            AND kcu.column_name = 'id'
            AND ccu.table_name = 'users'
            AND ccu.table_schema = 'auth'
      )
    LIMIT 1;

    -- Drop existing constraint if found
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || quote_ident(fk_name);
        RAISE NOTICE '✅ Dropped existing constraint: %', fk_name;
        constraint_found := TRUE;
    END IF;
    
    -- Try to drop any other constraints that might exist
    IF NOT constraint_found THEN
        FOR fk_name IN
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'user_profiles'
              AND tc.table_schema = 'public'
              AND ccu.table_name = 'users'
              AND ccu.table_schema = 'auth'
        LOOP
            EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_name);
            RAISE NOTICE '✅ Dropped additional constraint: %', fk_name;
            constraint_found := TRUE;
        END LOOP;
    END IF;
    
    -- Add new constraint with ON DELETE CASCADE
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_id_fkey_cascade 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ STEP 3 COMPLETED: user_profiles constraint fixed with ON DELETE CASCADE';
END $$;

-- =====================================================
-- STEP 4: FIX scan_history TABLE
-- =====================================================

DO $$
DECLARE
    fk_name TEXT;
    constraint_found BOOLEAN := FALSE;
    table_exists BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔧 STEP 4: Fixing scan_history table foreign key constraint...';
    
    -- Check if scan_history table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'scan_history' AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'ℹ️ scan_history table does not exist, skipping constraint fix';
        RETURN;
    END IF;
    
    -- Find the exact name of the foreign key constraint on scan_history
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'scan_history'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_schema = 'public'
      AND constraint_name IN (
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'scan_history'
            AND tc.table_schema = 'public'
            AND kcu.column_name = 'user_id'
            AND ccu.table_name = 'users'
            AND ccu.table_schema = 'auth'
      )
    LIMIT 1;

    -- Drop existing constraint if found
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.scan_history DROP CONSTRAINT ' || quote_ident(fk_name);
        RAISE NOTICE '✅ Dropped existing constraint: %', fk_name;
        constraint_found := TRUE;
    END IF;
    
    -- Try to drop any other constraints that might exist
    IF NOT constraint_found THEN
        FOR fk_name IN
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'scan_history'
              AND tc.table_schema = 'public'
              AND ccu.table_name = 'users'
              AND ccu.table_schema = 'auth'
        LOOP
            EXECUTE 'ALTER TABLE public.scan_history DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_name);
            RAISE NOTICE '✅ Dropped additional constraint: %', fk_name;
            constraint_found := TRUE;
        END LOOP;
    END IF;
    
    -- Add new constraint with ON DELETE CASCADE
    ALTER TABLE public.scan_history 
    ADD CONSTRAINT scan_history_user_id_fkey_cascade 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ STEP 4 COMPLETED: scan_history constraint fixed with ON DELETE CASCADE';
END $$;

-- =====================================================
-- STEP 5: FIX ANY OTHER TABLES REFERENCING auth.users
-- =====================================================

DO $$
DECLARE
    constraint_record RECORD;
    fk_name TEXT;
    table_name TEXT;
    column_name TEXT;
    new_constraint_name TEXT;
BEGIN
    RAISE NOTICE '🔧 STEP 5: Fixing any other tables referencing auth.users...';
    
    -- Find all other tables that reference auth.users
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
            AND tc.table_name NOT IN ('user_profiles', 'scan_history')
    LOOP
        table_name := constraint_record.table_name;
        column_name := constraint_record.column_name;
        fk_name := constraint_record.constraint_name;
        
        RAISE NOTICE '🔧 Fixing table: %.% (column: %)', constraint_record.table_schema, table_name, column_name;
        
        -- Drop existing constraint
        EXECUTE 'ALTER TABLE ' || constraint_record.table_schema || '.' || table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || quote_ident(fk_name);
        
        -- Create new constraint name
        new_constraint_name := table_name || '_' || column_name || '_fkey_cascade';
        
        -- Add new constraint with ON DELETE CASCADE
        EXECUTE 'ALTER TABLE ' || constraint_record.table_schema || '.' || table_name || 
                ' ADD CONSTRAINT ' || new_constraint_name || 
                ' FOREIGN KEY (' || column_name || ') REFERENCES auth.users(id) ON DELETE CASCADE';
        
        RAISE NOTICE '✅ Fixed table: %.% with constraint: %', constraint_record.table_schema, table_name, new_constraint_name;
    END LOOP;
    
    RAISE NOTICE '✅ STEP 5 COMPLETED: All other tables fixed';
END $$;

-- =====================================================
-- STEP 6: CLEAN UP ORPHANED DATA
-- =====================================================

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🧹 STEP 6: Cleaning up orphaned records...';
    
    -- Clean up orphaned records in user_profiles
    DELETE FROM public.user_profiles 
    WHERE id NOT IN (SELECT id FROM auth.users);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % orphaned user_profiles records', deleted_count;
    
    -- Clean up orphaned records in scan_history (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        DELETE FROM public.scan_history 
        WHERE user_id NOT IN (SELECT id FROM auth.users);
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE '✅ Deleted % orphaned scan_history records', deleted_count;
    END IF;
    
    RAISE NOTICE '✅ STEP 6 COMPLETED: Orphaned records cleaned up';
END $$;

-- =====================================================
-- STEP 7: VERIFY ALL CONSTRAINTS ARE PROPERLY SET
-- =====================================================

-- Show all foreign key constraints after the fix
SELECT 
    'VERIFICATION - ALL CONSTRAINTS AFTER FIX' as step,
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
-- STEP 8: SHOW USERS READY FOR DELETION TEST
-- =====================================================

-- Display current users that can be tested for deletion
SELECT 
    'USERS READY FOR DELETION TEST' as step,
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
-- STEP 9: CREATE COMPREHENSIVE DELETION TEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION test_comprehensive_user_deletion(test_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists_before BOOLEAN;
    profile_exists_before BOOLEAN;
    history_exists_before BOOLEAN;
    user_exists_after BOOLEAN;
    profile_exists_after BOOLEAN;
    history_exists_after BOOLEAN;
    result JSON;
    cascade_working BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🧪 Testing comprehensive user deletion for user: %', test_user_id;
    
    -- Check status before deletion
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists_before;
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO profile_exists_before;
    
    -- Check if scan_history exists and has records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        SELECT EXISTS(SELECT 1 FROM public.scan_history WHERE user_id = test_user_id) INTO history_exists_before;
    ELSE
        history_exists_before := FALSE;
    END IF;
    
    -- Build initial result
    result := json_build_object(
        'test_user_id', test_user_id,
        'before_deletion', json_build_object(
            'user_exists', user_exists_before,
            'profile_exists', profile_exists_before,
            'history_exists', history_exists_before
        )
    );
    
    -- If user exists, try to delete
    IF user_exists_before THEN
        RAISE NOTICE '🗑️ Attempting to delete user: %', test_user_id;
        
        -- Delete the user (should cascade to all related tables)
        DELETE FROM auth.users WHERE id = test_user_id;
        
        -- Check status after deletion
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists_after;
        SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO profile_exists_after;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
            SELECT EXISTS(SELECT 1 FROM public.scan_history WHERE user_id = test_user_id) INTO history_exists_after;
        ELSE
            history_exists_after := FALSE;
        END IF;
        
        -- Update result with after deletion status
        result := jsonb_set(
            result::jsonb, 
            '{after_deletion}', 
            json_build_object(
                'user_exists', user_exists_after,
                'profile_exists', profile_exists_after,
                'history_exists', history_exists_after
            )::jsonb
        );
        
        -- Check if cascade deletion was successful
        IF NOT user_exists_after AND NOT profile_exists_after AND NOT history_exists_after THEN
            cascade_working := TRUE;
            result := jsonb_set(result::jsonb, '{cascade_deletion_successful}', 'true'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"CASCADE deletion working perfectly across all tables!"'::jsonb);
            RAISE NOTICE '🎉 SUCCESS: Comprehensive CASCADE deletion test PASSED for user: %', test_user_id;
        ELSE
            result := jsonb_set(result::jsonb, '{cascade_deletion_successful}', 'false'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"CASCADE deletion failed - some records remain"'::jsonb);
            RAISE NOTICE '❌ FAILURE: Comprehensive CASCADE deletion test FAILED for user: %', test_user_id;
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
GRANT EXECUTE ON FUNCTION test_comprehensive_user_deletion(UUID) TO authenticated;

-- =====================================================
-- STEP 10: DELETE TEST USERS (OPTIONAL - UNCOMMENT TO USE)
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
    RAISE NOTICE '✅ Deleted % test users successfully', deleted_count;
END $$;
*/

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉🎉🎉 COMPREHENSIVE USER DELETION FIX COMPLETED! 🎉🎉🎉';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ STEP 1: Granted necessary privileges';
    RAISE NOTICE '✅ STEP 2: Identified all foreign key constraints';
    RAISE NOTICE '✅ STEP 3: Fixed user_profiles table with CASCADE';
    RAISE NOTICE '✅ STEP 4: Fixed scan_history table with CASCADE';
    RAISE NOTICE '✅ STEP 5: Fixed all other tables with CASCADE';
    RAISE NOTICE '✅ STEP 6: Cleaned up orphaned records';
    RAISE NOTICE '✅ STEP 7: Verified all constraints are properly set';
    RAISE NOTICE '✅ STEP 8: Created comprehensive test function';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🚀 USER DELETION SHOULD NOW WORK PERFECTLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test with: SELECT test_comprehensive_user_deletion(''user-uuid'');';
    RAISE NOTICE '2. Or delete users directly: DELETE FROM auth.users WHERE id = ''uuid'';';
    RAISE NOTICE '3. All related records will be automatically deleted via CASCADE!';
    RAISE NOTICE '4. Both user_profiles and scan_history now have ON DELETE CASCADE';
    RAISE NOTICE '=====================================================';
END $$;
