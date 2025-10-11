-- Fix risma.a's referral code from 'EMPTY' to proper generated code
-- This script will generate a unique referral code for risma.a

-- First, let's check the current state
SELECT 'CURRENT REFERRAL CODES:' as info;
SELECT id, display_name, referral_code 
FROM profiles 
ORDER BY created_at;

-- Generate a proper referral code for risma.a
UPDATE public.profiles 
SET referral_code = public.generate_referral_code('e439b5e8-0b86-4c5a-8271-6ca9d9961b66'::UUID)
WHERE id = 'e439b5e8-0b86-4c5a-8271-6ca9d9961b66';

-- Verify the update worked
SELECT 'UPDATED REFERRAL CODES:' as info;
SELECT id, display_name, referral_code, tokens
FROM profiles 
ORDER BY created_at;

-- Check that both users now have proper referral codes
SELECT 'VERIFICATION:' as info;
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles WHERE referral_code = 'EMPTY') = 0 
    THEN '✅ SUCCESS: All users have proper referral codes'
    ELSE '❌ ERROR: Some users still have EMPTY referral codes'
  END as status;
