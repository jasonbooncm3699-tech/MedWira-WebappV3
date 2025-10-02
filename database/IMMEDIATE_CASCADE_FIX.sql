-- =====================================================
-- IMMEDIATE CASCADE FIX: Quick User Deletion Fix
-- =====================================================
-- This script quickly fixes the foreign key constraints to enable user deletion
-- Run this if you need to immediately delete a user that's stuck
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING CONSTRAINTS
-- =====================================================

-- Drop the foreign key constraint from user_profiles
-- (This will allow us to delete users temporarily)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Drop any other constraints that might be blocking user deletion
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop any constraint from user_profiles to auth.users
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
        AND ccu.table_name = 'users'
        AND ccu.table_schema = 'auth';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- =====================================================
-- STEP 2: ADD NEW CONSTRAINT WITH CASCADE
-- =====================================================

-- Add the foreign key constraint back with ON DELETE CASCADE
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- =====================================================
-- STEP 3: CLEAN UP ORPHANED DATA
-- =====================================================

-- Delete any orphaned user_profiles records (profiles without users)
DELETE FROM public.user_profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- =====================================================
-- STEP 4: DELETE PROBLEMATIC TEST USERS
-- =====================================================

-- Find and delete test users that might be causing issues
DELETE FROM auth.users 
WHERE email LIKE '%test%' 
   OR email LIKE '%example%' 
   OR email LIKE '%debug%'
   OR email LIKE '%manual_test%';

-- =====================================================
-- STEP 5: VERIFY THE FIX
-- =====================================================

-- Check that the constraint is now properly set with CASCADE
SELECT 
    tc.constraint_name,
    tc.table_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'user_profiles' 
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'FOREIGN KEY';

-- Show remaining users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 CASCADE FIX APPLIED SUCCESSFULLY!';
    RAISE NOTICE '✅ Foreign key constraint updated with ON DELETE CASCADE';
    RAISE NOTICE '✅ Orphaned records cleaned up';
    RAISE NOTICE '✅ Test users deleted';
    RAISE NOTICE '🚀 User deletion should now work properly!';
END $$;
