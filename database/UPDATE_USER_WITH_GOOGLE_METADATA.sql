-- Update existing user profile with Google OAuth metadata from auth.users
-- This script will populate display_name and avatar_url from Google sign-up data

-- First, let's check what data is available in auth.users for the current user
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_user_meta_data->>'picture' as picture,
    raw_user_meta_data->>'name' as name
FROM auth.users 
WHERE email = 'jasonbooncm3699@gmail.com';

-- Update the profiles table with Google metadata
UPDATE public.profiles 
SET 
    display_name = auth_users.raw_user_meta_data->>'full_name',
    avatar_url = COALESCE(
        auth_users.raw_user_meta_data->>'avatar_url',
        auth_users.raw_user_meta_data->>'picture'
    ),
    updated_at = NOW()
FROM auth.users as auth_users
WHERE profiles.id = auth_users.id 
  AND auth_users.email = 'jasonbooncm3699@gmail.com';

-- Verify the update
SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    p.token_count,
    p.referral_code,
    a.email
FROM public.profiles p
JOIN auth.users a ON p.id = a.id
WHERE a.email = 'jasonbooncm3699@gmail.com';
