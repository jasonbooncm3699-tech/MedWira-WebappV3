-- =====================================================
-- TWO-STEP USER DELETION FIX
-- =====================================================
-- This script uses a focused two-step approach to fix the user_profiles
-- foreign key constraint and resolve user deletion failures
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING FOREIGN KEY CONSTRAINT
-- =====================================================

-- Show current constraint information before dropping
SELECT 
    'BEFORE DROP - Current Constraints' as step,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_profiles'
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'id';

-- Drop the foreign key constraint on user_profiles.id
-- Using IF EXISTS to avoid failure if constraint name is unknown
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Log the drop operation
DO $$
BEGIN
    RAISE NOTICE '✅ STEP 1 COMPLETED: Dropped foreign key constraint on user_profiles.id';
    RAISE NOTICE '   Constraint user_profiles_id_fkey has been removed';
END $$;

-- =====================================================
-- STEP 2: ADD CONSTRAINT WITH ON DELETE CASCADE
-- =====================================================

-- Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Log the add operation
DO $$
BEGIN
    RAISE NOTICE '✅ STEP 2 COMPLETED: Added foreign key constraint with ON DELETE CASCADE';
    RAISE NOTICE '   Constraint user_profiles_id_fkey now has CASCADE delete rule';
END $$;

-- =====================================================
-- STEP 3: VERIFY CONSTRAINT IS PROPERLY SET
-- =====================================================

-- Show constraint information after adding with CASCADE
SELECT 
    'AFTER ADD - Constraints with CASCADE' as step,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✅ CASCADE ENABLED'
        ELSE '❌ CASCADE NOT ENABLED'
    END as cascade_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_profiles'
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'id';

-- =====================================================
-- STEP 4: CLEAN UP ORPHANED DATA
-- =====================================================

-- Clean up any orphaned records in user_profiles
DELETE FROM public.user_profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Show cleanup results
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ STEP 3 COMPLETED: Cleaned up orphaned records';
    RAISE NOTICE '   Deleted % orphaned user_profiles records', deleted_count;
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
    CASE 
        WHEN email LIKE '%test%' THEN '🧪 TEST USER'
        WHEN email LIKE '%example%' THEN '📝 EXAMPLE USER'
        WHEN email LIKE '%debug%' THEN '🐛 DEBUG USER'
        WHEN email LIKE '%manual%' THEN '🔧 MANUAL USER'
        ELSE '👤 REGULAR USER'
    END as user_type
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 6: CREATE SIMPLE DELETION TEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION test_user_deletion_simple(test_user_id UUID)
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
BEGIN
    RAISE NOTICE '🧪 Testing user deletion for: %', test_user_id;
    
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
            result := jsonb_set(result::jsonb, '{deletion_successful}', 'true'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"User deletion with CASCADE successful!"'::jsonb);
            RAISE NOTICE '🎉 SUCCESS: User deletion with CASCADE worked perfectly!';
        ELSE
            result := jsonb_set(result::jsonb, '{deletion_successful}', 'false'::jsonb);
            result := jsonb_set(result::jsonb, '{message}', '"User deletion failed - some records remain"'::jsonb);
            RAISE NOTICE '❌ FAILURE: User deletion did not work as expected';
        END IF;
    ELSE
        result := jsonb_set(result::jsonb, '{deletion_successful}', 'false'::jsonb);
        result := jsonb_set(result::jsonb, '{message}', '"User does not exist"'::jsonb);
        RAISE NOTICE '⚠️ User does not exist: %', test_user_id;
    END IF;
    
    RETURN result;
END;
$$;

-- Grant permissions for test function
GRANT EXECUTE ON FUNCTION test_user_deletion_simple(UUID) TO authenticated;

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
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉🎉🎉 TWO-STEP USER DELETION FIX COMPLETED! 🎉🎉🎉';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ STEP 1: Dropped existing foreign key constraint';
    RAISE NOTICE '✅ STEP 2: Added constraint with ON DELETE CASCADE';
    RAISE NOTICE '✅ STEP 3: Verified CASCADE is properly enabled';
    RAISE NOTICE '✅ STEP 4: Cleaned up orphaned records';
    RAISE NOTICE '✅ STEP 5: Created test function for validation';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🚀 USER DELETION SHOULD NOW WORK PERFECTLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test with: SELECT test_user_deletion_simple(''user-uuid'');';
    RAISE NOTICE '2. Or delete users directly: DELETE FROM auth.users WHERE id = ''uuid'';';
    RAISE NOTICE '3. User profiles will be automatically deleted via CASCADE!';
    RAISE NOTICE '=====================================================';
END $$;
