-- CRITICAL TEST SCRIPT: User Profiles Provisioning System
-- Run this in Supabase SQL editor to test the critical fix

-- Test 1: Run the automated test function
SELECT test_user_provisioning() as automated_test_result;

-- Test 2: Verify trigger exists and is properly configured
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created' 
AND event_object_table = 'users'
AND event_object_schema = 'auth';

-- Test 3: Verify function exists and has correct security settings
SELECT 
    routine_name,
    routine_type,
    security_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_provisioning'
AND routine_schema = 'public';

-- Test 4: Check user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 5: Verify RLS policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- Test 6: Check indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
AND schemaname = 'public';

-- Test 7: Manual trigger test (commented out for production)
-- Uncomment these lines to test the trigger manually:
/*
DO $$
DECLARE
    test_user_id UUID;
    referral_code_result VARCHAR(20);
    token_count_result INTEGER;
BEGIN
    -- Generate a test user ID
    test_user_id := uuid_generate_v4();
    
    RAISE NOTICE 'Testing user provisioning with ID: %', test_user_id;
    
    -- Insert a test user (this should trigger the function)
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'manual_test@example.com',
        '$2a$10$dummy.hash',
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Manual Test User"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );
    
    -- Wait a moment for the trigger to execute
    PERFORM pg_sleep(1);
    
    -- Check if the user was provisioned
    SELECT referral_code, token_count 
    INTO referral_code_result, token_count_result
    FROM public.user_profiles
    WHERE id = test_user_id;
    
    IF referral_code_result IS NOT NULL AND token_count_result = 30 THEN
        RAISE NOTICE 'SUCCESS: User provisioned correctly - Referral Code: %, Tokens: %', 
            referral_code_result, token_count_result;
    ELSE
        RAISE NOTICE 'FAILURE: User not provisioned correctly - Referral Code: %, Tokens: %', 
            referral_code_result, token_count_result;
    END IF;
    
    -- Clean up
    DELETE FROM public.user_profiles WHERE id = test_user_id;
    DELETE FROM auth.users WHERE id = test_user_id;
    
    RAISE NOTICE 'Test completed and cleaned up';
END $$;
*/

-- Test 8: Verify current user_profiles data
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN token_count = 30 THEN 1 END) as users_with_30_tokens,
    COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as users_with_referral_codes,
    AVG(token_count) as average_tokens
FROM public.user_profiles;

-- Test 9: Check for any users without referral codes (potential issues)
SELECT 
    id,
    token_count,
    referral_code,
    created_at
FROM public.user_profiles 
WHERE referral_code IS NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- Test 10: Verify unique referral codes (should return 0 if all codes are unique)
SELECT 
    referral_code,
    COUNT(*) as count
FROM public.user_profiles 
WHERE referral_code IS NOT NULL
GROUP BY referral_code 
HAVING COUNT(*) > 1;

-- Summary: Expected Results
-- Test 1: Should return {"success": true, "message": "User provisioning test successful", ...}
-- Test 2: Should show trigger "on_auth_user_created" with "AFTER INSERT" timing
-- Test 3: Should show function "handle_new_user_provisioning" with "SECURITY DEFINER"
-- Test 4: Should show all required columns including token_count, referral_code, etc.
-- Test 5: Should show RLS policies for user_profiles table
-- Test 6: Should show indexes on referral_code and other columns
-- Test 7: Manual test (uncomment to run) should show SUCCESS message
-- Test 8: Should show statistics about user_profiles data
-- Test 9: Should ideally return 0 rows (no users without referral codes)
-- Test 10: Should return 0 rows (all referral codes are unique)
