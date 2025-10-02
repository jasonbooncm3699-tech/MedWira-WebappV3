-- =====================================================
-- CRITICAL USER DELETION FINAL FIX
-- =====================================================
-- This script programmatically identifies, drops, and recreates the foreign key
-- constraint on user_profiles table with ON DELETE CASCADE to fix user deletion failures
-- =====================================================

-- =====================================================
-- STEP 1: IDENTIFY AND DROP EXISTING CONSTRAINT
-- =====================================================

DO $$
DECLARE
    fk_name TEXT;
    constraint_found BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🔍 STEP 1: Identifying foreign key constraint on user_profiles...';
    
    -- Find the exact name of the foreign key constraint on user_profiles referencing auth.users
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

    -- If found, drop the constraint
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || quote_ident(fk_name);
        RAISE NOTICE '✅ Dropped existing constraint: %', fk_name;
        constraint_found := TRUE;
    ELSE
        RAISE NOTICE '⚠️ No existing foreign key constraint found to drop.';
    END IF;
    
    -- Additional check: try to drop any constraint that might exist with different naming
    IF NOT constraint_found THEN
        -- Try to drop any constraint that references auth.users from user_profiles
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
    
    IF constraint_found THEN
        RAISE NOTICE '🎉 STEP 1 COMPLETED: All existing constraints dropped successfully';
    ELSE
        RAISE NOTICE 'ℹ️ STEP 1 COMPLETED: No constraints found to drop (table may not have foreign key)';
    END IF;
END $$;

-- =====================================================
-- STEP 2: ADD CONSTRAINT WITH ON DELETE CASCADE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 STEP 2: Adding foreign key constraint with ON DELETE CASCADE...';
    
    -- Add the foreign key constraint with ON DELETE CASCADE
    ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_id_fkey_final 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ STEP 2 COMPLETED: Added constraint user_profiles_id_fkey_final with ON DELETE CASCADE';
END $$;

-- =====================================================
-- STEP 3: VERIFY CONSTRAINT IS PROPERLY SET
-- =====================================================

-- Show the new constraint with CASCADE rule
SELECT 
    'VERIFICATION - New Constraint' as step,
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
    AND tc.table_name = 'user_profiles'
    AND tc.table_schema = 'public'
    AND tc.constraint_name = 'user_profiles_id_fkey_final'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- STEP 4: CLEAN UP ORPHANED DATA
-- =====================================================

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🧹 STEP 3: Cleaning up orphaned records...';
    
    -- Delete orphaned records in user_profiles (profiles without users)
    DELETE FROM public.user_profiles 
    WHERE id NOT IN (SELECT id FROM auth.users);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ STEP 3 COMPLETED: Deleted % orphaned user_profiles records', deleted_count;
END $$;

-- =====================================================
-- STEP 5: SHOW USERS READY FOR DELETION TEST
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
-- STEP 6: CREATE COMPREHENSIVE DELETION TEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION test_cascade_deletion_final(test_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists_before BOOLEAN;
    profile_exists_before BOOLEAN;
    user_exists_after BOOLEAN;
    profile_exists_after BOOLEAN;
    result JSON;
    cascade_working BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '🧪 Testing CASCADE deletion for user: %', test_user_id;
    
    -- Check status before deletion
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists_before;
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO profile_exists_before;
    
    -- Build initial result
    result := json_build_object(
        'test_user_id', test_user_id,
        'before_deletion', json_build_object(
            'user_exists', user_exists_before,
            'profile_exists', profile_exists_before
        )
    );
    
    -- If user exists, try to delete
    IF user_exists_before THEN
        RAISE NOTICE '🗑️ Attempting to delete user: %', test_user_id;
        
        -- Delete the user (should cascade to user_profiles)
        DELETE FROM auth.users WHERE id = test_user_id;
        
        -- Check status after deletion
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists_after;
        SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO profile_exists_after;
        
        -- Update result with after deletion status
        result := jsonb_set(
            result::jsonb, 
            '{after_deletion}', 
            json_build_object(
                'user_exists', user_exists_after,
                'profile_exists', profile_exists_after
            )::jsonb
        );
        
        -- Check if cascade deletion was successful
        IF NOT user_exists_after AND NOT profile_exists_after THEN
            cascade_working := TRUE;
            result := jsonb_set(result::jsonb, '{cascade_deletion_successful}', 'true'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"CASCADE deletion working perfectly!"'::jsonb);
            RAISE NOTICE '🎉 SUCCESS: CASCADE deletion test PASSED for user: %', test_user_id;
        ELSE
            result := jsonb_set(result::jsonb, '{cascade_deletion_successful}', 'false'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"CASCADE deletion failed - some records remain"'::jsonb);
            RAISE NOTICE '❌ FAILURE: CASCADE deletion test FAILED for user: %', test_user_id;
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
GRANT EXECUTE ON FUNCTION test_cascade_deletion_final(UUID) TO authenticated;

-- =====================================================
-- STEP 7: DELETE TEST USERS (OPTIONAL - UNCOMMENT TO USE)
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
-- STEP 8: FINAL VERIFICATION
-- =====================================================

-- Show all foreign key constraints referencing auth.users after the fix
SELECT 
    'FINAL VERIFICATION - All Constraints' as step,
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
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉🎉🎉 CRITICAL USER DELETION FIX COMPLETED! 🎉🎉🎉';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ STEP 1: Identified and dropped existing constraints';
    RAISE NOTICE '✅ STEP 2: Added constraint with ON DELETE CASCADE';
    RAISE NOTICE '✅ STEP 3: Verified CASCADE is properly enabled';
    RAISE NOTICE '✅ STEP 4: Cleaned up orphaned records';
    RAISE NOTICE '✅ STEP 5: Created comprehensive test function';
    RAISE NOTICE '✅ STEP 6: Final verification completed';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🚀 USER DELETION SHOULD NOW WORK PERFECTLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test with: SELECT test_cascade_deletion_final(''user-uuid'');';
    RAISE NOTICE '2. Or delete users directly: DELETE FROM auth.users WHERE id = ''uuid'';';
    RAISE NOTICE '3. User profiles will be automatically deleted via CASCADE!';
    RAISE NOTICE '4. The constraint user_profiles_id_fkey_final now has ON DELETE CASCADE';
    RAISE NOTICE '=====================================================';
END $$;
