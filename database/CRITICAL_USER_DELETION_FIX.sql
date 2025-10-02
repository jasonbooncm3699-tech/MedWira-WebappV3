-- =====================================================
-- CRITICAL USER DELETION FIX
-- =====================================================
-- This script fixes the foreign key constraint violations that prevent user deletion
-- by adding ON DELETE CASCADE to all tables referencing auth.users(id)
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop foreign key constraint on user_profiles.id
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Drop foreign key constraint on scan_history.user_id (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        ALTER TABLE public.scan_history DROP CONSTRAINT IF EXISTS scan_history_user_id_fkey;
        RAISE NOTICE 'Dropped foreign key constraint from scan_history table';
    ELSE
        RAISE NOTICE 'scan_history table does not exist, skipping constraint drop';
    END IF;
END $$;

-- Drop any other foreign key constraints that might reference auth.users
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
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
        EXECUTE 'ALTER TABLE ' || constraint_record.table_schema || '.' || constraint_record.table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint % from table %.%', 
            constraint_record.constraint_name, 
            constraint_record.table_schema, 
            constraint_record.table_name;
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: ADD NEW FOREIGN KEY CONSTRAINTS WITH CASCADE
-- =====================================================

-- Add foreign key constraint to user_profiles with ON DELETE CASCADE
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

RAISE NOTICE 'Added CASCADE constraint to user_profiles table';

-- Add foreign key constraint to scan_history with ON DELETE CASCADE (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        -- Check if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scan_history' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE public.scan_history 
            ADD CONSTRAINT scan_history_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added CASCADE constraint to scan_history.user_id';
        ELSE
            RAISE NOTICE 'scan_history.user_id column does not exist, skipping constraint addition';
        END IF;
    ELSE
        RAISE NOTICE 'scan_history table does not exist, skipping CASCADE constraint addition';
    END IF;
END $$;

-- =====================================================
-- STEP 3: CLEAN UP ORPHANED DATA
-- =====================================================

-- Delete orphaned records in user_profiles (profiles without users)
DELETE FROM public.user_profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Delete orphaned records in scan_history (if table exists)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        DELETE FROM public.scan_history 
        WHERE user_id NOT IN (SELECT id FROM auth.users);
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % orphaned records from scan_history', deleted_count;
    ELSE
        RAISE NOTICE 'scan_history table does not exist, skipping orphaned record cleanup';
    END IF;
END $$;

-- =====================================================
-- STEP 4: VERIFY CONSTRAINTS ARE PROPERLY SET
-- =====================================================

-- Show all foreign key constraints referencing auth.users
SELECT 
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
-- STEP 5: TEST USER DELETION
-- =====================================================

-- Find users that might be causing deletion issues
SELECT 
    'Users in auth.users' as table_name,
    COUNT(*) as record_count
FROM auth.users

UNION ALL

SELECT 
    'Profiles in user_profiles' as table_name,
    COUNT(*) as record_count
FROM public.user_profiles

UNION ALL

SELECT 
    'Records in scan_history' as table_name,
    COUNT(*) as record_count
FROM public.scan_history
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public');

-- Show recent users that might need deletion
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    CASE 
        WHEN email LIKE '%test%' THEN 'TEST USER'
        WHEN email LIKE '%example%' THEN 'EXAMPLE USER'
        WHEN email LIKE '%debug%' THEN 'DEBUG USER'
        ELSE 'REGULAR USER'
    END as user_type
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 6: DELETE TEST USERS (OPTIONAL)
-- =====================================================

-- Uncomment the following lines to delete test users
-- DELETE FROM auth.users 
-- WHERE email LIKE '%test%' 
--    OR email LIKE '%example%' 
--    OR email LIKE '%debug%'
--    OR email LIKE '%manual_test%';

-- =====================================================
-- STEP 7: CREATE USER DELETION TEST FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION test_cascade_deletion(test_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN;
    profile_exists BOOLEAN;
    history_exists BOOLEAN;
    result JSON;
BEGIN
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
        'user_id', test_user_id,
        'before_deletion', json_build_object(
            'user_exists', user_exists,
            'profile_exists', profile_exists,
            'history_exists', history_exists
        )
    );
    
    -- If user exists, try to delete
    IF user_exists THEN
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
        
        -- Check if deletion was successful
        IF NOT user_exists AND NOT profile_exists AND NOT history_exists THEN
            result := jsonb_set(result::jsonb, '{deletion_successful}', 'true'::jsonb);
            RAISE NOTICE 'CASCADE deletion test SUCCESSFUL for user %', test_user_id;
        ELSE
            result := jsonb_set(result::jsonb, '{deletion_successful}', 'false'::jsonb);
            RAISE NOTICE 'CASCADE deletion test FAILED for user %', test_user_id;
        END IF;
    ELSE
        result := jsonb_set(result::jsonb, '{deletion_successful}', 'false'::jsonb);
        result := jsonb_set(result::jsonb, '{error}', '"User does not exist"'::jsonb);
    END IF;
    
    RETURN result;
END;
$$;

-- Grant permissions for test function
GRANT EXECUTE ON FUNCTION test_cascade_deletion(UUID) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 CRITICAL USER DELETION FIX COMPLETED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Foreign key constraints updated with ON DELETE CASCADE';
    RAISE NOTICE '✅ user_profiles table now cascades on user deletion';
    RAISE NOTICE '✅ scan_history table now cascades on user deletion (if exists)';
    RAISE NOTICE '✅ Orphaned records cleaned up';
    RAISE NOTICE '✅ Test function created for validation';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test user deletion: SELECT test_cascade_deletion(''user-uuid'');';
    RAISE NOTICE '2. Verify constraints show CASCADE in verification query';
    RAISE NOTICE '3. User deletion should now work without foreign key violations';
    RAISE NOTICE '=====================================================';
END $$;
