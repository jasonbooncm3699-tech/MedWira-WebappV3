-- Test script for user_profiles provisioning system
-- Run this in Supabase SQL editor to test the functions

-- Test 1: Generate referral codes
SELECT generate_referral_code() as test_referral_code_1;
SELECT generate_referral_code() as test_referral_code_2;
SELECT generate_referral_code() as test_referral_code_3;

-- Test 2: Provision a user manually using user_profiles table
SELECT provision_user_profile_manually(
    uuid_generate_v4(),
    'test@example.com',
    'Test User',
    NULL
) as provision_result;

-- Test 3: Provision a user with referral code
-- First, get a referral code from an existing user (if any)
-- Then use it in the next test
SELECT referral_code FROM public.user_profiles LIMIT 1;

-- Test 4: Get user by referral code from user_profiles
-- SELECT get_user_profile_by_referral_code('YOUR_REFERRAL_CODE_HERE');

-- Test 5: Update user token count in user_profiles
-- SELECT update_user_token_count(
--     'YOUR_USER_ID_HERE',
--     -5
-- );

-- Test 6: Verify user was created with correct data in user_profiles
SELECT 
    id,
    token_count,
    referral_code,
    referral_count,
    referred_by,
    created_at
FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 7: Check if trigger works (this would create a user in auth.users)
-- Note: This test requires actual Supabase auth setup
-- INSERT INTO auth.users (id, email, raw_user_meta_data) 
-- VALUES (uuid_generate_v4(), 'trigger_test@example.com', '{"name": "Trigger Test User"}');

-- Test 8: Verify the trigger created a corresponding record in user_profiles
-- SELECT 
--     au.id as auth_user_id,
--     au.email,
--     up.id as profile_id,
--     up.token_count,
--     up.referral_code
-- FROM auth.users au
-- LEFT JOIN public.user_profiles up ON au.id = up.id
-- WHERE au.email = 'trigger_test@example.com';

-- Clean up test data (optional)
-- DELETE FROM public.user_profiles WHERE id IN (
--     SELECT id FROM auth.users WHERE email LIKE '%test%'
-- );
-- DELETE FROM auth.users WHERE email LIKE '%test%';
