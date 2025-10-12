-- Fix email data inconsistency in public.profiles table
-- This updates the profiles table to have the correct email addresses from auth.users

-- First, let's see what we're working with
SELECT 
    p.id,
    p.display_name,
    p.email as profile_email,
    au.email as auth_email,
    p.tokens,
    p.referral_code
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at;

-- Update profiles table to sync email from auth.users
UPDATE public.profiles 
SET 
    email = au.email,
    updated_at = NOW()
FROM auth.users au
WHERE public.profiles.id = au.id 
AND public.profiles.email IS NULL;

-- Verify the update worked
SELECT 
    p.id,
    p.display_name,
    p.email as profile_email,
    au.email as auth_email,
    p.tokens,
    p.referral_code,
    p.updated_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at;

-- Check if there are any remaining NULL emails
SELECT COUNT(*) as profiles_with_null_email
FROM public.profiles 
WHERE email IS NULL;
