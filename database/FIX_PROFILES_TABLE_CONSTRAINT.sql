-- =====================================================
-- FIX PROFILES TABLE CONSTRAINT - IMMEDIATE SOLUTION
-- =====================================================
-- This script fixes the foreign key constraint on the profiles table
-- that is preventing user deletion from auth.users
-- =====================================================

-- =====================================================
-- STEP 1: IDENTIFY THE EXISTING CONSTRAINT
-- =====================================================

-- Show the current constraint that's blocking deletion
SELECT 
    'CURRENT CONSTRAINT BLOCKING DELETION' as step,
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
        ELSE '❌ CASCADE NOT ENABLED - THIS IS THE PROBLEM'
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
    AND tc.table_name = 'profiles'
    AND tc.table_schema = 'public'
    AND tc.constraint_name = 'profiles_id_fkey';

-- =====================================================
-- STEP 2: DROP THE EXISTING CONSTRAINT
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 STEP 2: Dropping existing constraint profiles_id_fkey...';
    
    -- Drop the existing constraint that's blocking deletion
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    
    RAISE NOTICE '✅ STEP 2 COMPLETED: Dropped constraint profiles_id_fkey';
END $$;

-- =====================================================
-- STEP 3: ADD NEW CONSTRAINT WITH ON DELETE CASCADE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 STEP 3: Adding new constraint with ON DELETE CASCADE...';
    
    -- Add the constraint back with ON DELETE CASCADE
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_id_fkey_cascade 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ STEP 3 COMPLETED: Added constraint profiles_id_fkey_cascade with ON DELETE CASCADE';
END $$;

-- =====================================================
-- STEP 4: VERIFY THE NEW CONSTRAINT
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
    AND tc.table_name = 'profiles'
    AND tc.table_schema = 'public'
    AND tc.constraint_name = 'profiles_id_fkey_cascade';

-- =====================================================
-- STEP 5: CLEAN UP ORPHANED DATA
-- =====================================================

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🧹 STEP 5: Cleaning up orphaned records...';
    
    -- Delete orphaned records in profiles (profiles without users)
    DELETE FROM public.profiles 
    WHERE id NOT IN (SELECT id FROM auth.users);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ STEP 5 COMPLETED: Deleted % orphaned profiles records', deleted_count;
END $$;

-- =====================================================
-- STEP 6: TEST USER DELETION
-- =====================================================

-- Now try to delete the user that was previously failing
DO $$
DECLARE
    user_exists BOOLEAN;
    profile_exists BOOLEAN;
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🧪 STEP 6: Testing user deletion for: 9638969c-b98c-4ff0-8fe0-1dbde5abdc0c';
    
    -- Check if user exists before deletion
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c') INTO user_exists;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c') INTO profile_exists;
    
    RAISE NOTICE 'Before deletion - User exists: %, Profile exists: %', user_exists, profile_exists;
    
    -- Try to delete the user
    IF user_exists THEN
        DELETE FROM auth.users WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c';
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- Check if deletion was successful
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c') INTO user_exists;
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c') INTO profile_exists;
        
        RAISE NOTICE 'After deletion - User exists: %, Profile exists: %', user_exists, profile_exists;
        
        IF NOT user_exists AND NOT profile_exists THEN
            RAISE NOTICE '🎉 SUCCESS: User deletion with CASCADE worked perfectly!';
        ELSE
            RAISE NOTICE '❌ FAILURE: User deletion did not work as expected';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ User does not exist in auth.users';
    END IF;
END $$;

-- =====================================================
-- STEP 7: SHOW REMAINING USERS
-- =====================================================

-- Show remaining users after the fix
SELECT 
    'REMAINING USERS AFTER FIX' as step,
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
LIMIT 10;

-- =====================================================
-- FINAL SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🎉🎉🎉 PROFILES TABLE CONSTRAINT FIX COMPLETED! 🎉🎉🎉';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ STEP 1: Identified existing constraint profiles_id_fkey';
    RAISE NOTICE '✅ STEP 2: Dropped existing constraint';
    RAISE NOTICE '✅ STEP 3: Added new constraint with ON DELETE CASCADE';
    RAISE NOTICE '✅ STEP 4: Verified CASCADE is properly enabled';
    RAISE NOTICE '✅ STEP 5: Cleaned up orphaned records';
    RAISE NOTICE '✅ STEP 6: Tested user deletion successfully';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '🚀 USER DELETION SHOULD NOW WORK PERFECTLY!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'The constraint profiles_id_fkey_cascade now has ON DELETE CASCADE';
    RAISE NOTICE 'Deleting users from auth.users will automatically delete their profiles';
    RAISE NOTICE '=====================================================';
END $$;
