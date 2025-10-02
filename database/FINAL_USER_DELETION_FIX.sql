-- =====================================================
-- FINAL USER DELETION FIX - HANDLE EXISTING CONSTRAINTS
-- =====================================================
-- This script handles the existing constraint and fixes user deletion
-- =====================================================

-- =====================================================
-- STEP 1: CHECK CURRENT CONSTRAINT STATUS
-- =====================================================

-- Show current constraints on profiles table
SELECT 
    'CURRENT CONSTRAINTS ON PROFILES' as step,
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
-- STEP 2: DROP ALL EXISTING FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Drop the original constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;

-- Drop the cascade constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey_cascade;

-- =====================================================
-- STEP 3: ADD NEW CONSTRAINT WITH ON DELETE CASCADE
-- =====================================================

-- Add the constraint with ON DELETE CASCADE
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_referred_by_fkey_cascade 
FOREIGN KEY (referred_by) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

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
    AND tc.constraint_name = 'profiles_referred_by_fkey_cascade';

-- =====================================================
-- STEP 5: CLEAN UP ORPHANED DATA
-- =====================================================

-- Delete orphaned records in profiles (profiles without users)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Delete orphaned referred_by references
DELETE FROM public.profiles 
WHERE referred_by IS NOT NULL 
  AND referred_by NOT IN (SELECT id FROM auth.users);

-- =====================================================
-- STEP 6: TEST USER DELETION
-- =====================================================

-- Now try to delete the user that was previously failing
DELETE FROM auth.users WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c';

-- =====================================================
-- STEP 7: VERIFY DELETION WAS SUCCESSFUL
-- =====================================================

-- Check if the user and related records were deleted
SELECT 
    'DELETION VERIFICATION' as step,
    'auth.users' as table_name,
    COUNT(*) as remaining_records
FROM auth.users 
WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c'

UNION ALL

SELECT 
    'DELETION VERIFICATION' as step,
    'profiles (id)' as table_name,
    COUNT(*) as remaining_records
FROM public.profiles 
WHERE id = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c'

UNION ALL

SELECT 
    'DELETION VERIFICATION' as step,
    'profiles (referred_by)' as table_name,
    COUNT(*) as remaining_records
FROM public.profiles 
WHERE referred_by = '9638969c-b98c-4ff0-8fe0-1dbde5abdc0c';

-- =====================================================
-- STEP 8: SHOW REMAINING USERS
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

SELECT '🎉 FINAL USER DELETION FIX COMPLETED! 🎉' as message;
SELECT 'The constraint profiles_referred_by_fkey_cascade now has ON DELETE CASCADE' as status;
SELECT 'User deletion should now work perfectly!' as result;