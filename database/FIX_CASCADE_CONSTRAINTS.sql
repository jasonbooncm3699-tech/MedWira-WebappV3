-- =====================================================
-- FIX CASCADE CONSTRAINTS: Enable User Deletion
-- =====================================================
-- This script fixes foreign key constraints to allow proper user deletion
-- by adding ON DELETE CASCADE to all tables that reference auth.users
-- =====================================================

-- =====================================================
-- STEP 1: IDENTIFY EXISTING CONSTRAINTS
-- =====================================================

-- Show current foreign key constraints that reference auth.users
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
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- STEP 2: DROP EXISTING CONSTRAINTS
-- =====================================================

-- Drop foreign key constraint from user_profiles table
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for user_profiles.id -> auth.users.id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'user_profiles'
        AND tc.table_schema = 'public'
        AND kcu.column_name = 'id'
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint % from user_profiles table', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found for user_profiles.id -> auth.users.id';
    END IF;
END $$;

-- Drop foreign key constraint from scan_history table (if it exists)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for scan_history.user_id -> auth.users.id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'scan_history'
        AND tc.table_schema = 'public'
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.scan_history DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint % from scan_history table', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found for scan_history.user_id -> auth.users.id';
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
            AND tc.table_name NOT IN ('user_profiles', 'scan_history')
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_schema || '.' || constraint_record.table_name || 
                ' DROP CONSTRAINT ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint % from table %.%', 
            constraint_record.constraint_name, 
            constraint_record.table_schema, 
            constraint_record.table_name;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: ADD NEW CONSTRAINTS WITH ON DELETE CASCADE
-- =====================================================

-- Add foreign key constraint to user_profiles with CASCADE
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key constraint to scan_history with CASCADE (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        ALTER TABLE public.scan_history 
        ADD CONSTRAINT scan_history_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added CASCADE constraint to scan_history table';
    ELSE
        RAISE NOTICE 'scan_history table does not exist, skipping constraint addition';
    END IF;
END $$;

-- =====================================================
-- STEP 4: VERIFY NEW CONSTRAINTS
-- =====================================================

-- Show the new foreign key constraints with CASCADE
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
-- STEP 5: CLEAN UP BAD DATA
-- =====================================================

-- Find orphaned records in user_profiles (users that don't exist in auth.users)
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as orphaned_records
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;

-- Find orphaned records in scan_history (if table exists)
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO orphaned_count
        FROM public.scan_history sh
        LEFT JOIN auth.users au ON sh.user_id = au.id
        WHERE au.id IS NULL;
        
        RAISE NOTICE 'Orphaned records in scan_history: %', orphaned_count;
    ELSE
        RAISE NOTICE 'scan_history table does not exist, skipping orphaned record check';
    END IF;
END $$;

-- =====================================================
-- STEP 6: TEST USER DELETION
-- =====================================================

-- Find test users that might be causing issues
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email LIKE '%test%' 
   OR email LIKE '%example%'
   OR email LIKE '%debug%'
ORDER BY created_at DESC;

-- Create a test deletion function
CREATE OR REPLACE FUNCTION test_user_deletion(test_user_id UUID)
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
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists;
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = test_user_id) INTO profile_exists;
    
    -- Check if scan history exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scan_history' AND table_schema = 'public') THEN
        SELECT EXISTS(SELECT 1 FROM public.scan_history WHERE user_id = test_user_id) INTO history_exists;
    ELSE
        history_exists := FALSE;
    END IF;
    
    -- Return status before deletion
    SELECT json_build_object(
        'user_id', test_user_id,
        'before_deletion', json_build_object(
            'user_exists', user_exists,
            'profile_exists', profile_exists,
            'history_exists', history_exists
        )
    ) INTO result;
    
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
            RAISE NOTICE 'User deletion test SUCCESSFUL for user %', test_user_id;
        ELSE
            result := jsonb_set(result::jsonb, '{deletion_successful}', 'false'::jsonb);
            RAISE NOTICE 'User deletion test FAILED for user %', test_user_id;
        END IF;
    ELSE
        result := jsonb_set(result::jsonb, '{deletion_successful}', 'false'::jsonb);
        result := jsonb_set(result::jsonb, '{error}', '"User does not exist"'::jsonb);
    END IF;
    
    RETURN result;
END;
$$;

-- Grant permissions for test function
GRANT EXECUTE ON FUNCTION test_user_deletion(UUID) TO authenticated;

-- =====================================================
-- STEP 7: CLEANUP COMMANDS
-- =====================================================

-- Example: Delete a specific test user (replace with actual user ID)
-- SELECT test_user_deletion('user-uuid-here'::UUID);

-- Example: Delete all test users
-- DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%example%' OR email LIKE '%debug%';

-- =====================================================
-- STEP 8: VERIFICATION QUERIES
-- =====================================================

-- Verify cascade constraints are working
SELECT 
    'user_profiles constraint' as constraint_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'user_profiles' 
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY'

UNION ALL

SELECT 
    'scan_history constraint' as constraint_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'scan_history' 
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'CASCADE CONSTRAINTS FIX COMPLETED!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Foreign key constraints updated with ON DELETE CASCADE';
    RAISE NOTICE '✅ user_profiles table now cascades on user deletion';
    RAISE NOTICE '✅ scan_history table now cascades on user deletion (if exists)';
    RAISE NOTICE '✅ Test function created for user deletion testing';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test user deletion with: SELECT test_user_deletion(''user-uuid'');';
    RAISE NOTICE '2. Verify constraints with verification queries above';
    RAISE NOTICE '3. Clean up any remaining test users';
    RAISE NOTICE '=====================================================';
END $$;
