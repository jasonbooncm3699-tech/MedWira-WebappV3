-- Test script for new user provisioning system
-- Run this in Supabase SQL editor to test the functions

-- Test 1: Generate referral codes
SELECT generate_referral_code() as test_referral_code_1;
SELECT generate_referral_code() as test_referral_code_2;
SELECT generate_referral_code() as test_referral_code_3;

-- Test 2: Provision a user manually
SELECT provision_user_manually(
    uuid_generate_v4(),
    'test@example.com',
    'Test User',
    NULL
) as provision_result;

-- Test 3: Provision a user with referral code
-- First, get a referral code from an existing user (if any)
-- Then use it in the next test
SELECT referral_code FROM users LIMIT 1;

-- Test 4: Get user by referral code
-- SELECT get_user_by_referral_code('YOUR_REFERRAL_CODE_HERE');

-- Test 5: Update user tokens
-- SELECT update_user_tokens(
--     'YOUR_USER_ID_HERE',
--     -5
-- );

-- Test 6: Verify user was created with correct data
SELECT 
    id,
    email,
    name,
    tokens,
    subscription_tier,
    referral_code,
    referral_count,
    referred_by,
    created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 7: Check if trigger works (this would create a user in auth.users)
-- Note: This test requires actual Supabase auth setup
-- INSERT INTO auth.users (id, email, raw_user_meta_data) 
-- VALUES (uuid_generate_v4(), 'trigger_test@example.com', '{"name": "Trigger Test User"}');

-- Clean up test data (optional)
-- DELETE FROM users WHERE email LIKE '%test%';
